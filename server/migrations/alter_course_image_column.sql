-- Alter image column in course table to accommodate longer URLs
ALTER TABLE public.course ALTER COLUMN image TYPE TEXT;