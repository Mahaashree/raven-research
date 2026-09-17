import re
from dataclasses import dataclass

from app.llm import chat_json

SYSTEM_PROMPT = (
    "You check whether a claim is actually supported by a source document. "
    "Respond with ONLY a JSON object matching this schema: "
    '{"verdict": "supported" | "unsupported" | "partially_supported", '
    '"explanation": string, "quoted_evidence": string | null}. '
    "'supported' = the source text directly backs the claim, including matching "
    "any specific numbers/wording. 'partially_supported' = the source discusses "
    "the same subject but the claim overstates, understates, or slightly "
    "misrepresents what the source says. 'unsupported' = the source does not "
    "back the claim, or the claim isn't addressed at all. "
    "'explanation' is 1-3 sentences justifying the verdict. 'quoted_evidence' "
    "is a short EXACT excerpt copied verbatim from the source text (aim for "
    "under ~20 words, but a slightly longer exact quote is fine if that's what "
    "it takes to capture the actual supporting sentence/number) if the verdict "
    "is 'supported' or 'partially_supported'; null if 'unsupported'."
)

# Groq's free tier caps request size well under the model's nominal context
# window (observed: a ~41k-char/~10k-token request 413'd outright). Keep
# comfortably under that.
MAX_INPUT_CHARS = 16_000

VALID_VERDICTS = {"supported", "unsupported", "partially_supported"}

# Intro chars always included so the model has the paper's framing/context.
INTRO_CHARS = 1500
_DISTINCTIVE_TOKEN_RE = re.compile(r"\d+\.?\d*%?|\b[A-Z][a-zA-Z]{4,}\b")


def _relevant_excerpt(claim: str, raw_content: str, max_chars: int) -> str:
    """Truncating a long paper from the start risks cutting off the exact
    section that actually supports/contradicts a claim (e.g. a numeric result
    buried in a Results section). Center the truncation window on wherever
    the claim's distinctive terms (numbers, capitalized words) actually
    appear in the document, falling back to a plain prefix if none match."""
    if len(raw_content) <= max_chars:
        return raw_content

    tokens = _DISTINCTIVE_TOKEN_RE.findall(claim)
    positions = [raw_content.find(t) for t in tokens]
    positions = [p for p in positions if p != -1]

    intro = raw_content[:INTRO_CHARS]
    if not positions:
        return raw_content[:max_chars]

    center = min(positions)
    window_budget = max_chars - INTRO_CHARS
    half = window_budget // 2
    start = max(INTRO_CHARS, center - half)
    end = min(len(raw_content), start + window_budget)
    window = raw_content[start:end]
    return f"{intro}\n\n[...]\n\n{window}"


@dataclass
class VerificationResult:
    verdict: str
    explanation: str
    quoted_evidence: str | None


def verify_claim(claim: str, raw_content: str, max_retries: int = 2) -> VerificationResult:
    excerpt = _relevant_excerpt(claim, raw_content, MAX_INPUT_CHARS)
    user_content = f"Claim: {claim}\n\nSource document:\n{excerpt}"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
    data = chat_json(messages, temperature=0.0, max_retries=max_retries)
    verdict = data.get("verdict")
    if verdict not in VALID_VERDICTS:
        raise ValueError(f"Model returned an invalid verdict: {verdict!r}")
    return VerificationResult(
        verdict=verdict,
        explanation=data.get("explanation", ""),
        quoted_evidence=data.get("quoted_evidence"),
    )
