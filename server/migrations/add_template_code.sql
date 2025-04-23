-- Add template_code column to lesson table
ALTER TABLE lesson ADD COLUMN template_code TEXT;

-- Update existing lessons to have empty template code
UPDATE lesson SET template_code = '' WHERE template_code IS NULL; 

-- Add rating column to course table
ALTER TABLE course ADD COLUMN rating DECIMAL(3,2) DEFAULT 0;

-- Populate existing course ratings from feedback
UPDATE course 
SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM feedback 
    WHERE feedback.course_id = course.course_id
);  