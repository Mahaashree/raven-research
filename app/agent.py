import asyncio
import json

from langchain_core.messages import AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from app.agent_tools import ALL_TOOLS
from app.config import settings

# Bounds how many agent loop steps LangGraph will take before erroring out,
# so a confused free-tier model can't loop indefinitely.
RECURSION_LIMIT = 15

# The free-tier model sits behind a shared, unreliable upstream provider that
# occasionally returns malformed-request errors unrelated to the actual
# request content (observed: spurious 400s mid tool-calling loop). Retrying
# the whole agent run from scratch works around this in practice.
MAX_RUN_RETRIES = 2

SYSTEM_PROMPT = (
    "You are a research assistant with access to the user's saved corpus and arXiv. "
    "Use search_saved_items to check what the user already has saved before "
    "reaching for arxiv_search or fetch_and_parse. Cite item ids/urls you drew "
    "from in your final answer. Be concise and direct."
)

GAP_FINDER_PROMPT_TEMPLATE = (
    "The user wants to find a coverage gap in their saved research corpus on the "
    "topic: \"{topic}\".\n\n"
    "1. Call search_saved_items to see what the user has already saved on this topic.\n"
    "2. Call arxiv_search to find papers on arXiv about this topic.\n"
    "3. Compare the two lists. Identify arXiv papers from step 2 that are NOT "
    "already represented in the saved corpus from step 1 (different paper, not "
    "just a similar topic).\n\n"
    "Respond with a short intro sentence, then a list of the papers NOT yet "
    "saved: for each, give the arxiv_id, title, and a one-sentence note on why "
    "it's relevant to the topic. If everything arXiv returned is already saved, "
    "say so explicitly."
)


def _build_agent():
    model = ChatOpenAI(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1",
        temperature=0.2,
    )
    return create_react_agent(model, tools=ALL_TOOLS, state_modifier=SYSTEM_PROMPT)


# Built lazily so importing this module doesn't require GROQ_API_KEY to be set.
_agent = None


def _get_agent():
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


async def run_agent(query: str) -> dict:
    agent = _get_agent()

    last_error: Exception | None = None
    result = None
    for attempt in range(MAX_RUN_RETRIES + 1):
        try:
            result = await agent.ainvoke(
                {"messages": [("user", query)]},
                config={"recursion_limit": RECURSION_LIMIT},
            )
            break
        except Exception as e:
            last_error = e
            if attempt < MAX_RUN_RETRIES:
                await asyncio.sleep(min(2**attempt, 10))
    if result is None:
        raise last_error

    messages = result["messages"]

    tools_used: list[str] = []
    item_ids_used: set[str] = set()
    tool_call_names: dict[str, str] = {}

    for msg in messages:
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for call in msg.tool_calls:
                tools_used.append(call["name"])
                tool_call_names[call["id"]] = call["name"]
        elif isinstance(msg, ToolMessage):
            name = tool_call_names.get(msg.tool_call_id)
            if name == "search_saved_items":
                try:
                    for item in json.loads(msg.content):
                        item_ids_used.add(item["id"])
                except (json.JSONDecodeError, TypeError, KeyError):
                    pass

    final_message = messages[-1]
    answer = final_message.content if isinstance(final_message, AIMessage) else ""

    return {
        "answer": answer,
        "tools_used": tools_used,
        "item_ids_used": sorted(item_ids_used),
    }


async def run_gap_finder(topic: str) -> dict:
    """Gap-finder is just run_agent with a directive prompt: no separate pipeline."""
    return await run_agent(GAP_FINDER_PROMPT_TEMPLATE.format(topic=topic))
