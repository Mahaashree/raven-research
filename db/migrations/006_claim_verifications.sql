CREATE TYPE claim_verdict AS ENUM ('supported', 'unsupported', 'partially_supported');

CREATE TABLE claim_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    claim TEXT NOT NULL,
    verdict claim_verdict NOT NULL,
    explanation TEXT NOT NULL,
    quoted_evidence TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Exact-text cache key: a re-check of the same claim string for the same
    -- item should hit this row instead of calling the LLM again.
    UNIQUE (item_id, claim)
);
