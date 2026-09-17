import asyncio
import logging
import uuid

from app.db import get_pool
from app.embed import embed
from app.fetchers import fetch
from app.repository import mark_failed, mark_processed
from app.summarize import summarize

logger = logging.getLogger(__name__)


async def process_item(item_id: uuid.UUID, url: str) -> None:
    pool = await get_pool()
    try:
        fetch_result = await asyncio.to_thread(fetch, url)
        summary = await asyncio.to_thread(summarize, fetch_result.text)
        # Embed the summary, not the full text: it's shorter (cheaper/faster to
        # embed), and it concentrates the semantically dense claims that search
        # queries actually target, rather than diluting them with boilerplate.
        vector = await asyncio.to_thread(embed, summary.summary)

        await mark_processed(
            pool,
            item_id,
            item_type=fetch_result.item_type,
            title=fetch_result.title,
            raw_content=fetch_result.text,
            summary_text=summary.summary,
            key_claims=summary.key_claims,
            method=summary.method,
            embedding=vector,
        )
    except Exception as e:
        logger.exception("Failed to process item %s (%s)", item_id, url)
        await mark_failed(pool, item_id, str(e))
