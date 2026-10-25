ALTER TABLE campaigns ADD COLUMN settings text;
ALTER TABLE campaigns ADD COLUMN history text NOT NULL DEFAULT '[]';
