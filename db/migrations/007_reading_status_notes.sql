CREATE TYPE reading_status AS ENUM ('active', 'done');

ALTER TABLE items ADD COLUMN reading_status reading_status NOT NULL DEFAULT 'active';
ALTER TABLE items ADD COLUMN user_note TEXT;
