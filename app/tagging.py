from app.llm import chat_json

SYSTEM_PROMPT = (
    "You suggest short topical tags for a saved research item, based on its summary "
    "and key claims. Respond with ONLY a JSON object: {\"tags\": string[]}. "
    "Suggest 3-6 tags. Each tag is 1-3 lowercase words, no punctuation "
    '(e.g. "retrieval-augmented-generation", "transformers", "benchmark").'
)


def suggest_tags(summary_text: str, key_claims: list[str], max_retries: int = 2) -> list[str]:
    user_content = f"Summary: {summary_text}\n\nKey claims:\n" + "\n".join(f"- {c}" for c in key_claims)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
    data = chat_json(messages, temperature=0.3, max_retries=max_retries)
    tags = data.get("tags", [])
    return [t.strip().lower() for t in tags if isinstance(t, str) and t.strip()]
