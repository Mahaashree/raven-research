CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE item_type AS ENUM ('paper', 'article', 'blog');
CREATE TYPE item_status AS ENUM ('pending', 'processed', 'failed');

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    raw_content TEXT,
    type item_type NOT NULL DEFAULT 'article',
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status item_status NOT NULL DEFAULT 'pending',
    error_message TEXT
);

-- all-MiniLM-L6-v2 produces 384-dim embeddings
CREATE TABLE summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    key_claims JSONB NOT NULL DEFAULT '[]',
    method TEXT,
    embedding vector(384)
);

-- No ANN index (ivfflat/hnsw) for Phase 1: at this scale (a handful to low
-- thousands of items) an exact sequential scan over `embedding <=> query` is
-- both fast enough and exact. ivfflat in particular needs a large `lists`
-- relative to row count to have good recall (empirically ~10+ rows per list),
-- and with a tiny table it silently drops matches instead of erroring. Revisit
-- (hnsw is the better default when the time comes) once item counts are large
-- enough that a seq scan shows up in practice.
CREATE INDEX items_status_idx ON items (status);
