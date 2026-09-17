CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#EF9F27',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE collections ADD COLUMN description TEXT;
ALTER TABLE collections ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
