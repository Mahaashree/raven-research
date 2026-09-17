import json
import uuid

import asyncpg


async def create_item(pool: asyncpg.Pool, url: str) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO items (url, type, status)
        VALUES ($1, 'article', 'pending')
        RETURNING id, url, raw_content, type, saved_at, status, error_message
        """,
        url,
    )
    return dict(row)


async def list_items(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch(
        """
        SELECT i.id, i.url, i.title, i.type, i.status, i.saved_at, i.error_message,
               i.reading_status, i.user_note,
               s.summary_text,
               COALESCE(
                   array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
                   '{}'
               ) AS tags
        FROM items i
        LEFT JOIN summaries s ON s.item_id = i.id
        LEFT JOIN item_tags it ON it.item_id = i.id
        LEFT JOIN tags t ON t.id = it.tag_id
        GROUP BY i.id, s.summary_text
        ORDER BY i.saved_at DESC
        """
    )
    return [dict(row) for row in rows]


async def update_item(
    pool: asyncpg.Pool,
    item_id: uuid.UUID,
    reading_status: str | None = None,
    user_note: str | None = None,
) -> None:
    if reading_status is not None:
        await pool.execute(
            "UPDATE items SET reading_status = $2 WHERE id = $1", item_id, reading_status
        )
    if user_note is not None:
        await pool.execute("UPDATE items SET user_note = $2 WHERE id = $1", item_id, user_note)


async def mark_processed(
    pool: asyncpg.Pool,
    item_id: uuid.UUID,
    item_type: str,
    title: str | None,
    raw_content: str,
    summary_text: str,
    key_claims: list[str],
    method: str | None,
    embedding: list[float],
) -> None:
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE items
                SET status = 'processed', type = $2, title = $3, raw_content = $4, error_message = NULL
                WHERE id = $1
                """,
                item_id,
                item_type,
                title,
                raw_content,
            )
            await conn.execute(
                """
                INSERT INTO summaries (item_id, summary_text, key_claims, method, embedding)
                VALUES ($1, $2, $3, $4, $5::vector)
                """,
                item_id,
                summary_text,
                json.dumps(key_claims),
                method,
                embedding_str,
            )


async def delete_item(pool: asyncpg.Pool, item_id: uuid.UUID) -> None:
    await pool.execute("DELETE FROM items WHERE id = $1", item_id)


async def mark_failed(pool: asyncpg.Pool, item_id: uuid.UUID, error_message: str) -> None:
    await pool.execute(
        "UPDATE items SET status = 'failed', error_message = $2 WHERE id = $1",
        item_id,
        error_message[:2000],
    )


async def get_item_with_summary(pool: asyncpg.Pool, item_id: uuid.UUID) -> dict | None:
    row = await pool.fetchrow(
        """
        SELECT i.id, i.url, i.title, i.type, i.saved_at, i.status, i.error_message,
               i.reading_status, i.user_note, i.last_viewed_at,
               s.summary_text, s.key_claims, s.method,
               COALESCE(
                   array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
                   '{}'
               ) AS tags
        FROM items i
        LEFT JOIN summaries s ON s.item_id = i.id
        LEFT JOIN item_tags it ON it.item_id = i.id
        LEFT JOIN tags t ON t.id = it.tag_id
        WHERE i.id = $1
        GROUP BY i.id, s.summary_text, s.key_claims, s.method
        """,
        item_id,
    )
    if row is None:
        return None
    result = dict(row)
    if result["key_claims"] is not None:
        result["key_claims"] = json.loads(result["key_claims"])
    return result


async def touch_last_viewed(pool: asyncpg.Pool, item_id: uuid.UUID) -> None:
    await pool.execute("UPDATE items SET last_viewed_at = now() WHERE id = $1", item_id)


async def search_summaries(pool: asyncpg.Pool, query_embedding: list[float], limit: int = 10) -> list[dict]:
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
    rows = await pool.fetch(
        """
        SELECT i.id, i.url, i.type, i.saved_at,
               s.summary_text, s.key_claims, s.method,
               1 - (s.embedding <=> $1::vector) AS similarity
        FROM summaries s
        JOIN items i ON i.id = s.item_id
        WHERE s.embedding IS NOT NULL
        ORDER BY s.embedding <=> $1::vector
        LIMIT $2
        """,
        embedding_str,
        limit,
    )
    results = []
    for row in rows:
        item = dict(row)
        item["key_claims"] = json.loads(item["key_claims"])
        results.append(item)
    return results


async def get_summary_for_item(pool: asyncpg.Pool, item_id: uuid.UUID) -> dict | None:
    row = await pool.fetchrow(
        "SELECT summary_text, key_claims FROM summaries WHERE item_id = $1",
        item_id,
    )
    if row is None:
        return None
    result = dict(row)
    result["key_claims"] = json.loads(result["key_claims"])
    return result


async def find_similar_items(pool: asyncpg.Pool, item_id: uuid.UUID, limit: int = 5) -> list[dict]:
    """Find items most similar to `item_id` by embedding distance, excluding itself."""
    rows = await pool.fetch(
        """
        SELECT i.id, i.url, s.summary_text, s.key_claims,
               1 - (s.embedding <=> src.embedding) AS similarity
        FROM summaries s
        JOIN items i ON i.id = s.item_id
        CROSS JOIN (SELECT embedding FROM summaries WHERE item_id = $1) src
        WHERE s.item_id != $1 AND s.embedding IS NOT NULL
        ORDER BY s.embedding <=> src.embedding
        LIMIT $2
        """,
        item_id,
        limit,
    )
    results = []
    for row in rows:
        item = dict(row)
        item["key_claims"] = json.loads(item["key_claims"])
        results.append(item)
    return results


async def add_tags(pool: asyncpg.Pool, item_id: uuid.UUID, tag_names: list[str]) -> list[str]:
    async with pool.acquire() as conn:
        async with conn.transaction():
            for name in tag_names:
                tag_id = await conn.fetchval(
                    """
                    INSERT INTO tags (name) VALUES ($1)
                    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
                    RETURNING id
                    """,
                    name,
                )
                await conn.execute(
                    "INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    item_id,
                    tag_id,
                )
    return await get_item_tags(pool, item_id)


async def remove_tag(pool: asyncpg.Pool, item_id: uuid.UUID, tag_name: str) -> None:
    await pool.execute(
        """
        DELETE FROM item_tags
        WHERE item_id = $1 AND tag_id = (SELECT id FROM tags WHERE name = $2)
        """,
        item_id,
        tag_name,
    )


async def get_item_tags(pool: asyncpg.Pool, item_id: uuid.UUID) -> list[str]:
    rows = await pool.fetch(
        """
        SELECT t.name FROM tags t
        JOIN item_tags it ON it.tag_id = t.id
        WHERE it.item_id = $1
        ORDER BY t.name
        """,
        item_id,
    )
    return [row["name"] for row in rows]


async def create_collection(
    pool: asyncpg.Pool,
    name: str,
    description: str | None = None,
    project_id: uuid.UUID | None = None,
) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO collections (name, description, project_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, project_id, created_at
        """,
        name,
        description,
        project_id,
    )
    return dict(row)


async def add_item_to_collection(pool: asyncpg.Pool, collection_id: uuid.UUID, item_id: uuid.UUID) -> None:
    await pool.execute(
        "INSERT INTO collection_items (collection_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        collection_id,
        item_id,
    )


async def list_collections(pool: asyncpg.Pool, project_id: uuid.UUID | None = None) -> list[dict]:
    rows = await pool.fetch(
        """
        SELECT c.id, c.name, c.description, c.project_id, c.created_at,
               count(ci.item_id) AS item_count
        FROM collections c
        LEFT JOIN collection_items ci ON ci.collection_id = c.id
        WHERE $1::uuid IS NULL OR c.project_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC
        """,
        project_id,
    )
    return [dict(row) for row in rows]


async def get_collection_with_items(pool: asyncpg.Pool, collection_id: uuid.UUID) -> dict | None:
    collection_row = await pool.fetchrow(
        """
        SELECT c.id, c.name, c.description, c.created_at, c.project_id, p.name AS project_name
        FROM collections c
        LEFT JOIN projects p ON p.id = c.project_id
        WHERE c.id = $1
        """,
        collection_id,
    )
    if collection_row is None:
        return None
    item_rows = await pool.fetch(
        """
        SELECT i.id, i.url, i.title, i.type, i.status, i.saved_at,
               i.reading_status, i.user_note,
               s.summary_text, s.key_claims, s.method,
               row_number() OVER (ORDER BY ci.added_at) AS board_position
        FROM collection_items ci
        JOIN items i ON i.id = ci.item_id
        LEFT JOIN summaries s ON s.item_id = i.id
        WHERE ci.collection_id = $1
        ORDER BY ci.added_at
        """,
        collection_id,
    )
    items = []
    for row in item_rows:
        item = dict(row)
        if item["key_claims"] is not None:
            item["key_claims"] = json.loads(item["key_claims"])
        items.append(item)
    result = dict(collection_row)
    result["items"] = items
    result["item_count"] = len(items)
    return result


async def create_project(pool: asyncpg.Pool, name: str, color: str) -> dict:
    row = await pool.fetchrow(
        "INSERT INTO projects (name, color) VALUES ($1, $2) RETURNING id, name, color, created_at",
        name,
        color,
    )
    return dict(row)


async def list_projects(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch(
        """
        SELECT p.id, p.name, p.color, p.created_at,
               count(DISTINCT c.id) AS board_count
        FROM projects p
        LEFT JOIN collections c ON c.project_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at
        """
    )
    return [dict(row) for row in rows]


async def get_boards_for_item(pool: asyncpg.Pool, item_id: uuid.UUID) -> list[dict]:
    rows = await pool.fetch(
        """
        SELECT c.id, c.name,
               (SELECT count(*) FROM collection_items ci2 WHERE ci2.collection_id = c.id) AS item_count,
               (
                   SELECT count(*) FROM collection_items ci3
                   WHERE ci3.collection_id = c.id AND ci3.added_at <= ci.added_at
               ) AS board_position
        FROM collection_items ci
        JOIN collections c ON c.id = ci.collection_id
        WHERE ci.item_id = $1
        """,
        item_id,
    )
    return [dict(row) for row in rows]


async def create_relation(
    pool: asyncpg.Pool,
    item_id_a: uuid.UUID,
    item_id_b: uuid.UUID,
    relation_type: str,
    note: str | None,
) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO relations (item_id_a, item_id_b, relation_type, note)
        VALUES ($1, $2, $3, $4)
        RETURNING id, item_id_a, item_id_b, relation_type, note, created_at
        """,
        item_id_a,
        item_id_b,
        relation_type,
        note,
    )
    return dict(row)


async def get_relations_for_item(pool: asyncpg.Pool, item_id: uuid.UUID) -> list[dict]:
    """Relations where item_id is either side, always reported from item_id's
    point of view (as_source=True means item_id -> other, i.e. relation_type
    reads directly; as_source=False means other -> item_id, i.e. reversed)."""
    rows = await pool.fetch(
        """
        SELECT r.id, r.relation_type, r.note, r.created_at,
               (r.item_id_a = $1) AS as_source,
               CASE WHEN r.item_id_a = $1 THEN i_b.id ELSE i_a.id END AS other_item_id,
               CASE WHEN r.item_id_a = $1 THEN i_b.url ELSE i_a.url END AS other_item_url,
               CASE WHEN r.item_id_a = $1 THEN i_b.title ELSE i_a.title END AS other_item_title
        FROM relations r
        JOIN items i_a ON i_a.id = r.item_id_a
        JOIN items i_b ON i_b.id = r.item_id_b
        WHERE r.item_id_a = $1 OR r.item_id_b = $1
        ORDER BY r.created_at DESC
        """,
        item_id,
    )
    return [dict(row) for row in rows]


async def get_item_raw_content(pool: asyncpg.Pool, item_id: uuid.UUID) -> dict | None:
    row = await pool.fetchrow(
        "SELECT id, url, title, raw_content FROM items WHERE id = $1",
        item_id,
    )
    return dict(row) if row else None


async def get_claim_verification(pool: asyncpg.Pool, item_id: uuid.UUID, claim: str) -> dict | None:
    row = await pool.fetchrow(
        """
        SELECT id, item_id, claim, verdict, explanation, quoted_evidence, checked_at
        FROM claim_verifications
        WHERE item_id = $1 AND claim = $2
        """,
        item_id,
        claim,
    )
    return dict(row) if row else None


async def create_claim_verification(
    pool: asyncpg.Pool,
    item_id: uuid.UUID,
    claim: str,
    verdict: str,
    explanation: str,
    quoted_evidence: str | None,
) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO claim_verifications (item_id, claim, verdict, explanation, quoted_evidence)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (item_id, claim) DO UPDATE SET
            verdict = EXCLUDED.verdict,
            explanation = EXCLUDED.explanation,
            quoted_evidence = EXCLUDED.quoted_evidence,
            checked_at = now()
        RETURNING id, item_id, claim, verdict, explanation, quoted_evidence, checked_at
        """,
        item_id,
        claim,
        verdict,
        explanation,
        quoted_evidence,
    )
    return dict(row)


async def get_resurfaced_candidates(
    pool: asyncpg.Pool, staleness_days: int = 14, limit: int = 3
) -> list[dict]:
    """Items worth resurfacing: not done, not viewed recently (or never),
    ranked by how well-connected they are (so 'Connects to your N saves' is
    real) and then by how long it's been since they were last opened."""
    rows = await pool.fetch(
        """
        SELECT i.id, i.url, i.title, i.type, i.saved_at, i.last_viewed_at,
               s.summary_text, s.key_claims, s.method,
               COALESCE(deg.relation_count, 0) AS relation_count
        FROM items i
        JOIN summaries s ON s.item_id = i.id
        LEFT JOIN (
            SELECT item_id, count(*) AS relation_count FROM (
                SELECT item_id_a AS item_id FROM relations
                UNION ALL
                SELECT item_id_b AS item_id FROM relations
            ) x GROUP BY item_id
        ) deg ON deg.item_id = i.id
        WHERE i.status = 'processed'
          AND i.reading_status = 'active'
          AND (i.last_viewed_at IS NULL OR i.last_viewed_at < now() - ($1 || ' days')::interval)
        ORDER BY
            COALESCE(deg.relation_count, 0) DESC,
            (i.last_viewed_at IS NULL) DESC,
            i.last_viewed_at ASC,
            i.saved_at DESC
        LIMIT $2
        """,
        str(staleness_days),
        limit,
    )
    results = []
    for row in rows:
        item = dict(row)
        item["key_claims"] = json.loads(item["key_claims"])
        results.append(item)
    return results


async def get_equation_decoding(pool: asyncpg.Pool, item_id: uuid.UUID, equation_text: str) -> dict | None:
    row = await pool.fetchrow(
        """
        SELECT id, item_id, equation_text, decoding_json, created_at
        FROM equation_decodings
        WHERE item_id = $1 AND equation_text = $2
        """,
        item_id,
        equation_text,
    )
    if row is None:
        return None
    result = dict(row)
    result["decoding"] = json.loads(result.pop("decoding_json"))
    return result


async def create_equation_decoding(
    pool: asyncpg.Pool, item_id: uuid.UUID, equation_text: str, decoding: dict
) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO equation_decodings (item_id, equation_text, decoding_json)
        VALUES ($1, $2, $3)
        ON CONFLICT (item_id, equation_text) DO UPDATE SET decoding_json = EXCLUDED.decoding_json
        RETURNING id, item_id, equation_text, decoding_json, created_at
        """,
        item_id,
        equation_text,
        json.dumps(decoding),
    )
    result = dict(row)
    result["decoding"] = json.loads(result.pop("decoding_json"))
    return result


async def get_knowledge_graph(pool: asyncpg.Pool) -> dict:
    node_rows = await pool.fetch(
        """
        SELECT i.id, i.title, i.url, i.type, i.reading_status,
               COALESCE(deg.connections, 0) AS connections
        FROM items i
        LEFT JOIN (
            SELECT item_id, count(*) AS connections FROM (
                SELECT item_id_a AS item_id FROM relations
                UNION ALL
                SELECT item_id_b AS item_id FROM relations
            ) x GROUP BY item_id
        ) deg ON deg.item_id = i.id
        WHERE i.status = 'processed'
        """
    )
    edge_rows = await pool.fetch(
        "SELECT id, item_id_a, item_id_b, relation_type, note FROM relations"
    )
    nodes = [
        {
            "id": r["id"],
            "label": r["title"] or r["url"],
            "url": r["url"],
            "type": r["type"],
            "reading_status": r["reading_status"],
            "connections": r["connections"],
        }
        for r in node_rows
    ]
    edges = [
        {
            "id": r["id"],
            "source": r["item_id_a"],
            "target": r["item_id_b"],
            "relation_type": r["relation_type"],
            "note": r["note"],
        }
        for r in edge_rows
    ]
    stats = {
        "total_nodes": len(nodes),
        "rabbit_holes": sum(1 for n in nodes if n["reading_status"] == "active"),
        "archived": sum(1 for n in nodes if n["reading_status"] == "done"),
    }
    return {"nodes": nodes, "edges": edges, "stats": stats}


async def get_knowledge_graph_for_item(pool: asyncpg.Pool, item_id: uuid.UUID) -> dict | None:
    center = await pool.fetchrow(
        "SELECT id, title, url, type FROM items WHERE id = $1",
        item_id,
    )
    if center is None:
        return None

    edge_rows = await pool.fetch(
        """
        SELECT r.id, r.item_id_a, r.item_id_b, r.relation_type, r.note,
               i_a.title AS a_title, i_a.url AS a_url, i_a.type AS a_type,
               i_b.title AS b_title, i_b.url AS b_url, i_b.type AS b_type
        FROM relations r
        JOIN items i_a ON i_a.id = r.item_id_a
        JOIN items i_b ON i_b.id = r.item_id_b
        WHERE r.item_id_a = $1 OR r.item_id_b = $1
        """,
        item_id,
    )

    nodes_by_id = {
        center["id"]: {
            "id": center["id"],
            "label": center["title"] or center["url"],
            "url": center["url"],
            "type": center["type"],
        }
    }
    edges = []
    for r in edge_rows:
        nodes_by_id.setdefault(
            r["item_id_a"],
            {"id": r["item_id_a"], "label": r["a_title"] or r["a_url"], "url": r["a_url"], "type": r["a_type"]},
        )
        nodes_by_id.setdefault(
            r["item_id_b"],
            {"id": r["item_id_b"], "label": r["b_title"] or r["b_url"], "url": r["b_url"], "type": r["b_type"]},
        )
        edges.append(
            {
                "id": r["id"],
                "source": r["item_id_a"],
                "target": r["item_id_b"],
                "relation_type": r["relation_type"],
                "note": r["note"],
            }
        )

    return {"nodes": list(nodes_by_id.values()), "edges": edges}


async def create_agent_run(
    pool: asyncpg.Pool,
    query: str,
    answer: str | None,
    tools_used: list[str],
    item_ids_used: list[str],
    error_message: str | None = None,
) -> dict:
    row = await pool.fetchrow(
        """
        INSERT INTO agent_runs (query, answer, tools_used, item_ids_used, error_message)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, query, answer, tools_used, item_ids_used, error_message, created_at
        """,
        query,
        answer,
        json.dumps(tools_used),
        json.dumps(item_ids_used),
        error_message,
    )
    result = dict(row)
    result["tools_used"] = json.loads(result["tools_used"])
    result["item_ids_used"] = json.loads(result["item_ids_used"])
    return result
