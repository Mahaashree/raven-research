from dataclasses import dataclass

from app.llm import chat_json

SYSTEM_PROMPT = (
    "You are a research assistant that summarizes papers, articles, and blog posts. "
    "Respond with ONLY a JSON object matching this exact schema, no markdown fences, "
    'no extra text: {"summary": string, "key_claims": string[], "method": string | null}. '
    "'summary' is a concise 3-6 sentence summary. 'key_claims' is a list of the main "
    "claims/findings as short strings. 'method' briefly describes the methodology used, "
    "or null if not applicable (e.g. for a blog post with no formal method)."
)

# Groq's free tier caps request size well under the model's nominal context
# window (a ~41k-char/~10k-token request gets a flat 413), so truncate well
# under that regardless of the model's advertised context length.
MAX_INPUT_CHARS = 16_000


@dataclass
class Summary:
    summary: str
    key_claims: list[str]
    method: str | None


def summarize(text: str, max_retries: int = 2) -> Summary:
    truncated = text[:MAX_INPUT_CHARS]
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": truncated},
    ]
    data = chat_json(messages, temperature=0.2, max_retries=max_retries)
    return Summary(
        summary=data["summary"],
        key_claims=list(data.get("key_claims", [])),
        method=data.get("method"),
    )
