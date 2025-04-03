-- Alter profileimage column to accommodate longer URLs
ALTER TABLE users ALTER COLUMN profileimage TYPE TEXT;