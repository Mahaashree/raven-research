from dataclasses import dataclass

from app.llm import chat_json

SYSTEM_PROMPT = (
    "You explain a single equation from a research paper to someone who finds "
    "math notation intimidating. Respond with ONLY a JSON object matching this "
    'schema: {"pronunciation": string, "variable_types": {"<symbol>": string, ...}, '
    '"plain_language": string, "tiny_example": string, "role_in_paper": string}. '
    "'pronunciation' is how to say the equation aloud, e.g. \"y hat equals sigma "
    "of w transpose x plus b\". 'variable_types' maps each distinct symbol in the "
    "equation to what kind of object it is and its shape if inferable, e.g. "
    "{\"w\": \"vector, shape (d,)\", \"b\": \"scalar\"}. 'plain_language' is 1-2 "
    "sentences translating the equation to plain English, no jargon. "
    "'tiny_example' is a small worked numeric example plugging in concrete "
    "numbers and showing the result. 'role_in_paper' explains why this equation "
    "matters in the context of the paper described below — ground it in the "
    "paper's actual content, not a generic explanation."
)


@dataclass
class EquationDecoding:
    pronunciation: str
    variable_types: dict[str, str]
    plain_language: str
    tiny_example: str
    role_in_paper: str


def decode_equation(
    equation_text: str,
    paper_summary: str,
    key_claims: list[str],
    max_retries: int = 2,
) -> EquationDecoding:
    context = f"Paper summary: {paper_summary}\n\nKey claims:\n" + "\n".join(
        f"- {c}" for c in key_claims
    )
    user_content = f"Equation: {equation_text}\n\nPaper context:\n{context}"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
    data = chat_json(messages, temperature=0.1, max_retries=max_retries)
    return EquationDecoding(
        pronunciation=data.get("pronunciation", ""),
        variable_types=dict(data.get("variable_types", {})),
        plain_language=data.get("plain_language", ""),
        tiny_example=data.get("tiny_example", ""),
        role_in_paper=data.get("role_in_paper", ""),
    )
