import asyncio
import json

import arxiv
from langchain_core.tools import tool

from app.db import get_pool
from app.embed import embed
from app.fetchers import fetch
from app.repository import search_summaries
from app.summarize import summarize as summarize_text

_arxiv_client = arxiv.Client(page_size=10, delay_seconds=3.0, num_retries=3)


@tool
async def search_saved_items(query: str, limit: int = 5) -> str:
    """Search the user's saved corpus (already-ingested papers/articles/blogs) by
    semantic similarity. Use this to find what the user has already saved on a topic.
    Returns a JSON list of {id, url, similarity, summary} for the best matches."""
    query_embedding = await asyncio.to_thread(embed, query)
    pool = await get_pool()
    results = await search_summaries(pool, query_embedding, limit=limit)
    trimmed = [
        {
            "id": str(r["id"]),
            "url": r["url"],
            "similarity": round(r["similarity"], 3),
            "summary": r["summary_text"],
        }
        for r in results
    ]
    return json.dumps(trimmed)


@tool
def arxiv_search(query: str, max_results: int = 5) -> str:
    """Search arXiv directly (not the user's saved corpus) for papers matching a
    topic. Use this to find papers that may not be saved yet. Returns a JSON list
    of {arxiv_id, title, summary, url, published}."""
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.Relevance,
    )
    results = []
    for r in _arxiv_client.results(search):
        results.append(
            {
                "arxiv_id": r.get_short_id(),
                "title": r.title,
                "summary": r.summary[:500],
                "url": r.entry_id,
                "published": r.published.isoformat() if r.published else None,
            }
        )
    return json.dumps(results)


@tool
def fetch_and_parse(url: str) -> str:
    """Fetch and extract the full text of a URL (arXiv paper, PDF, or webpage).
    Use this when you need the actual content of something not yet saved, e.g.
    before summarizing it. Returns the extracted text (may be truncated)."""
    result = fetch(url)
    return result.text[:20_000]


@tool
def summarize(text: str) -> str:
    """Summarize a piece of text (e.g. text returned by fetch_and_parse) into a
    structured summary. Returns JSON: {summary, key_claims, method}."""
    result = summarize_text(text)
    return json.dumps(
        {"summary": result.summary, "key_claims": result.key_claims, "method": result.method}
    )


ALL_TOOLS = [search_saved_items, arxiv_search, fetch_and_parse, summarize]
