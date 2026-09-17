import json
import time

import httpx

from app.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

TRANSIENT_STATUS_CODES = {429, 502, 503}


def _post_with_retry(headers: dict, payload: dict, max_transient_retries: int = 4) -> dict:
    for attempt in range(max_transient_retries + 1):
        resp = httpx.post(GROQ_URL, headers=headers, json=payload, timeout=60.0)
        if resp.status_code in TRANSIENT_STATUS_CODES and attempt < max_transient_retries:
            time.sleep(min(2**attempt, 15))
            continue
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("unreachable")


def _strip_json_fences(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = content.strip("`")
        if content.startswith("json"):
            content = content[4:]
    return content


def chat(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.2,
    tools: list[dict] | None = None,
) -> dict:
    """Raw Groq chat completion call. Returns the full response body."""
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model or settings.groq_model,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        payload["tools"] = tools
    return _post_with_retry(headers, payload)


def chat_json(
    messages: list[dict],
    model: str | None = None,
    temperature: float = 0.2,
    max_retries: int = 2,
) -> dict:
    """Chat completion that expects a raw JSON object back, with a repair-retry
    loop if the model returns something that doesn't parse."""
    messages = list(messages)
    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        body = chat(messages, model=model, temperature=temperature)
        content = body["choices"][0]["message"]["content"]
        try:
            return json.loads(_strip_json_fences(content))
        except json.JSONDecodeError as e:
            last_error = e
            messages.append({"role": "assistant", "content": content})
            messages.append(
                {
                    "role": "user",
                    "content": "That was not valid JSON. Respond again with ONLY the raw JSON object, no other text.",
                }
            )
    raise ValueError(f"Model did not return valid JSON after {max_retries + 1} attempts: {last_error}")
