-- Add template_code column to lesson table
ALTER TABLE lesson ADD COLUMN template_code TEXT;

-- Update existing lessons to have empty template code
UPDATE lesson SET template_code = '' WHERE template_code IS NULL; 