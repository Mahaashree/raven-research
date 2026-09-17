CREATE TYPE relation_type AS ENUM ('supports', 'contradicts', 'extends');

-- Directional: item_id_a -> item_id_b, e.g. "a extends b" is distinct from "b extends a".
CREATE TABLE relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id_a UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    item_id_b UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    relation_type relation_type NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (item_id_a != item_id_b)
);

CREATE INDEX relations_item_id_a_idx ON relations (item_id_a);
CREATE INDEX relations_item_id_b_idx ON relations (item_id_b);
