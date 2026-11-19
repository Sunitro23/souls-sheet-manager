ALTER TABLE accounts ADD COLUMN is_admin integer NOT NULL DEFAULT 0;
UPDATE accounts SET is_admin = 1 WHERE lower(username) = 'sun';
