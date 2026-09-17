CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    answer TEXT,
    tools_used JSONB NOT NULL DEFAULT '[]',
    item_ids_used JSONB NOT NULL DEFAULT '[]',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
