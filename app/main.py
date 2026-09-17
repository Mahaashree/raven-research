import asyncio
import uuid
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.db import close_pool, get_pool
from app.embed import embed
from app.pipeline import process_item
from app.repository import (
    add_item_to_collection,
    add_tags,
    create_agent_run,
    create_claim_verification,
    create_collection,
    create_equation_decoding,
    create_item,
    create_project,
    create_relation,
    delete_item,
    find_similar_items,
    get_boards_for_item,
    get_claim_verification,
    get_collection_with_items,
    get_equation_decoding,
    get_item_raw_content,
    get_item_with_summary,
    get_resurfaced_candidates,
    list_collections,
    list_items,
    list_projects,
    get_knowledge_graph,
    get_knowledge_graph_for_item,
    get_relations_for_item,
    get_summary_for_item,
    remove_tag,
    search_summaries,
    touch_last_viewed,
    update_item,
)
from app.agent import run_agent, run_gap_finder
from app.decode import decode_equation
from app.relations import classify_relation
from app.tagging import suggest_tags
from app.verify import verify_claim


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="Raven Research", lifespan=lifespan)

# Demo-only: wide open for local frontend dev (localhost:3000). Tighten
# origins before this is ever exposed beyond a local machine.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateItemRequest(BaseModel):
    url: str


@app.get("/items")
async def get_items():
    pool = await get_pool()
    return await list_items(pool)


@app.post("/items")
async def post_item(body: CreateItemRequest, background_tasks: BackgroundTasks):
    pool = await get_pool()
    item = await create_item(pool, body.url)
    background_tasks.add_task(process_item, item["id"], body.url)
    return item


@app.get("/items/{item_id}")
async def get_item(item_id: uuid.UUID):
    pool = await get_pool()
    item = await get_item_with_summary(pool, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    await touch_last_viewed(pool, item_id)
    return item


class UpdateItemRequest(BaseModel):
    reading_status: str | None = None
    user_note: str | None = None


@app.patch("/items/{item_id}")
async def patch_item(item_id: uuid.UUID, body: UpdateItemRequest):
    pool = await get_pool()
    if body.reading_status is not None and body.reading_status not in ("active", "done"):
        raise HTTPException(status_code=400, detail="reading_status must be 'active' or 'done'")
    await update_item(pool, item_id, reading_status=body.reading_status, user_note=body.user_note)
    item = await get_item_with_summary(pool, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.delete("/items/{item_id}")
async def delete_item_endpoint(item_id: uuid.UUID):
    pool = await get_pool()
    await delete_item(pool, item_id)
    return {"item_id": item_id, "deleted": True}


@app.get("/search")
async def search(q: str, limit: int = 10):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' must not be empty")
    query_embedding = await asyncio.to_thread(embed, q)
    pool = await get_pool()
    results = await search_summaries(pool, query_embedding, limit=limit)
    return {"query": q, "results": results}


class AddTagsRequest(BaseModel):
    tags: list[str] | None = None


@app.post("/items/{item_id}/tags")
async def post_tags(item_id: uuid.UUID, body: AddTagsRequest):
    pool = await get_pool()

    if body.tags is not None:
        tag_names = [t.strip().lower() for t in body.tags if t.strip()]
    else:
        summary = await get_summary_for_item(pool, item_id)
        if summary is None:
            raise HTTPException(
                status_code=409,
                detail="Item has no summary yet (still processing or failed); cannot auto-suggest tags",
            )
        tag_names = await asyncio.to_thread(suggest_tags, summary["summary_text"], summary["key_claims"])

    tags = await add_tags(pool, item_id, tag_names)
    return {"item_id": item_id, "tags": tags}


@app.delete("/items/{item_id}/tags/{tag_name}")
async def delete_tag(item_id: uuid.UUID, tag_name: str):
    pool = await get_pool()
    await remove_tag(pool, item_id, tag_name.strip().lower())
    return {"item_id": item_id, "removed": tag_name}


class CreateCollectionRequest(BaseModel):
    name: str
    description: str | None = None
    project_id: uuid.UUID | None = None


@app.get("/collections")
async def get_collections(project_id: uuid.UUID | None = None):
    pool = await get_pool()
    return await list_collections(pool, project_id)


@app.post("/collections")
async def post_collection(body: CreateCollectionRequest):
    pool = await get_pool()
    return await create_collection(pool, body.name, body.description, body.project_id)


class CreateProjectRequest(BaseModel):
    name: str
    color: str = "#EF9F27"


@app.get("/projects")
async def get_projects():
    pool = await get_pool()
    return await list_projects(pool)


@app.post("/projects")
async def post_project(body: CreateProjectRequest):
    pool = await get_pool()
    return await create_project(pool, body.name, body.color)


class AddCollectionItemRequest(BaseModel):
    item_id: uuid.UUID


@app.post("/collections/{collection_id}/items")
async def post_collection_item(collection_id: uuid.UUID, body: AddCollectionItemRequest):
    pool = await get_pool()
    await add_item_to_collection(pool, collection_id, body.item_id)
    collection = await get_collection_with_items(pool, collection_id)
    if collection is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


@app.get("/collections/{collection_id}")
async def get_collection(collection_id: uuid.UUID):
    pool = await get_pool()
    collection = await get_collection_with_items(pool, collection_id)
    if collection is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


@app.post("/items/{item_id}/find-relations")
async def post_find_relations(item_id: uuid.UUID, limit: int = 5):
    pool = await get_pool()
    summary = await get_summary_for_item(pool, item_id)
    if summary is None:
        raise HTTPException(
            status_code=409,
            detail="Item has no summary yet (still processing or failed); cannot find relations",
        )

    candidates = await find_similar_items(pool, item_id, limit=limit)
    created = []
    for candidate in candidates:
        classification = await asyncio.to_thread(
            classify_relation, summary["summary_text"], candidate["summary_text"]
        )
        if classification.relation_type is None:
            continue
        relation = await create_relation(
            pool, item_id, candidate["id"], classification.relation_type, classification.note
        )
        relation["other_item_url"] = candidate["url"]
        created.append(relation)

    return {"item_id": item_id, "candidates_considered": len(candidates), "relations_created": created}


@app.get("/items/{item_id}/boards")
async def get_item_boards(item_id: uuid.UUID):
    pool = await get_pool()
    return {"item_id": item_id, "boards": await get_boards_for_item(pool, item_id)}


@app.get("/items/{item_id}/relations")
async def get_relations(item_id: uuid.UUID):
    pool = await get_pool()
    relations = await get_relations_for_item(pool, item_id)
    return {"item_id": item_id, "relations": relations}


async def _run_and_log(pool, log_query: str, coro) -> dict:
    try:
        result = await coro
    except Exception as e:
        await create_agent_run(pool, log_query, None, [], [], error_message=str(e))
        raise HTTPException(status_code=502, detail=f"Agent run failed: {e}")

    return await create_agent_run(
        pool,
        log_query,
        result["answer"],
        result["tools_used"],
        result["item_ids_used"],
    )


class AgentQueryRequest(BaseModel):
    query: str


@app.post("/agent/query")
async def post_agent_query(body: AgentQueryRequest):
    pool = await get_pool()
    return await _run_and_log(pool, body.query, run_agent(body.query))


class GapFinderRequest(BaseModel):
    topic: str


@app.post("/agent/gap-finder")
async def post_gap_finder(body: GapFinderRequest):
    pool = await get_pool()
    return await _run_and_log(pool, f"[gap-finder] {body.topic}", run_gap_finder(body.topic))


class VerifyClaimRequest(BaseModel):
    claim: str


@app.post("/items/{item_id}/verify-claim")
async def post_verify_claim(item_id: uuid.UUID, body: VerifyClaimRequest):
    pool = await get_pool()
    claim = body.claim.strip()
    if not claim:
        raise HTTPException(status_code=400, detail="claim must not be empty")

    cached = await get_claim_verification(pool, item_id, claim)
    if cached is not None:
        cached["cached"] = True
        return cached

    item = await get_item_raw_content(pool, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    if not item["raw_content"]:
        raise HTTPException(
            status_code=409,
            detail="Item has no raw_content yet (still processing or failed); cannot verify claim",
        )

    result = await asyncio.to_thread(verify_claim, claim, item["raw_content"])
    row = await create_claim_verification(
        pool, item_id, claim, result.verdict, result.explanation, result.quoted_evidence
    )
    row["cached"] = False
    return row


@app.get("/desk/resurfaced")
async def get_resurfaced(staleness_days: int = 14, limit: int = 3):
    pool = await get_pool()
    candidates = await get_resurfaced_candidates(pool, staleness_days=staleness_days, limit=limit)
    return {"candidates": candidates}


class DecodeEquationRequest(BaseModel):
    equation_text: str


@app.post("/items/{item_id}/decode-equation")
async def post_decode_equation(item_id: uuid.UUID, body: DecodeEquationRequest):
    pool = await get_pool()
    equation_text = body.equation_text.strip()
    if not equation_text:
        raise HTTPException(status_code=400, detail="equation_text must not be empty")

    cached = await get_equation_decoding(pool, item_id, equation_text)
    if cached is not None:
        cached["cached"] = True
        return cached

    summary = await get_summary_for_item(pool, item_id)
    if summary is None:
        raise HTTPException(
            status_code=409,
            detail="Item has no summary yet (still processing or failed); cannot decode equation",
        )

    result = await asyncio.to_thread(
        decode_equation, equation_text, summary["summary_text"], summary["key_claims"]
    )
    row = await create_equation_decoding(
        pool,
        item_id,
        equation_text,
        {
            "pronunciation": result.pronunciation,
            "variable_types": result.variable_types,
            "plain_language": result.plain_language,
            "tiny_example": result.tiny_example,
            "role_in_paper": result.role_in_paper,
        },
    )
    row["cached"] = False
    return row


@app.get("/knowledge-graph")
async def get_full_knowledge_graph():
    pool = await get_pool()
    return await get_knowledge_graph(pool)


@app.get("/knowledge-graph/{item_id}")
async def get_item_knowledge_graph(item_id: uuid.UUID):
    pool = await get_pool()
    graph = await get_knowledge_graph_for_item(pool, item_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return graph
