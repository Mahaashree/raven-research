from dataclasses import dataclass

from app.llm import chat_json

SYSTEM_PROMPT = (
    "You compare two saved research items (A and B) and classify how A relates "
    "to B. Respond with ONLY a JSON object: "
    '{"relation_type": "supports" | "contradicts" | "extends" | "none", "note": string | null}. '
    "Direction matters: judge the relation FROM A TO B specifically. "
    "'supports' = A's findings corroborate or provide evidence for B's claims. "
    "'contradicts' = A's findings conflict with or undermine B's claims. "
    "'extends' = A builds on, generalizes, or applies B's ideas/method further. "
    "'none' = no meaningful direct relation beyond sharing a general topic. "
    "Use 'none' liberally \u2014 only classify a real relation if it's clear from the summaries. "
    "'note' is a one-sentence justification, or null if relation_type is 'none'."
)


@dataclass
class RelationClassification:
    relation_type: str | None  # None means "no relation"
    note: str | None


VALID_TYPES = {"supports", "contradicts", "extends"}


def classify_relation(
    item_a_summary: str,
    item_b_summary: str,
    max_retries: int = 2,
) -> RelationClassification:
    user_content = f"Item A:\n{item_a_summary}\n\nItem B:\n{item_b_summary}"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
    data = chat_json(messages, temperature=0.1, max_retries=max_retries)
    relation_type = data.get("relation_type")
    if relation_type not in VALID_TYPES:
        return RelationClassification(relation_type=None, note=None)
    return RelationClassification(relation_type=relation_type, note=data.get("note"))
