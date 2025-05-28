-- Performance optimization indexes for DevQuest
-- Run these commands in your PostgreSQL database to improve query performance

-- Index for course queries (most important for courses page)
CREATE INDEX IF NOT EXISTS idx_course_status_published ON course (status) WHERE status = 'Published';
CREATE INDEX IF NOT EXISTS idx_course_rating ON course (rating DESC) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_course_difficulty ON course (difficulty);

-- Index for enrollment queries
CREATE INDEX IF NOT EXISTS idx_enrollment_course_id ON enrollment (course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_user_id ON enrollment (user_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_user_course ON enrollment (user_id, course_id);

-- Index for lesson progress queries
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course ON lesson_progress (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress (user_id, completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_user ON lesson_progress (lesson_id, user_id);

-- Index for section-lesson relationships
CREATE INDEX IF NOT EXISTS idx_section_course_id ON section (course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_id ON lesson (section_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_order ON lesson (section_id, lesson_order);

-- Index for lessons by course query
CREATE INDEX IF NOT EXISTS idx_section_course_order ON section (course_id, section_order);

-- Index for feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_course_rating ON feedback (course_id, rating);
CREATE INDEX IF NOT EXISTS idx_feedback_user_course ON feedback (user_id, course_id);

-- Composite index for the optimized courses query
CREATE INDEX IF NOT EXISTS idx_enrollment_count_by_course ON enrollment (course_id, user_id);

-- Index for user authentication and session tracking
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_verification ON users (is_verified) WHERE is_verified = true;

-- Analyze tables after creating indexes for better query planning
ANALYZE course;
ANALYZE enrollment;
ANALYZE lesson_progress;
ANALYZE section;
ANALYZE lesson;
ANALYZE feedback;
ANALYZE users;
