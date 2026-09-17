ALTER TABLE items ADD COLUMN last_viewed_at TIMESTAMPTZ;

CREATE TABLE equation_decodings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    equation_text TEXT NOT NULL,
    decoding_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (item_id, equation_text)
);
