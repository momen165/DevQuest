-- Performance Indexes Migration
-- This file adds indexes to improve query performance for frequently accessed tables

-- Index for user lookups by email (used in authentication)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for user_sessions lookups by user_id (used in sessionTracker)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON user_sessions(session_start DESC);

-- Index for lesson_progress lookups (frequently joined with lessons and sections)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress(completed) WHERE completed = true;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON lesson_progress(user_id, lesson_id);

-- Index for enrollment lookups (frequently queried by user_id and course_id)
CREATE INDEX IF NOT EXISTS idx_enrollment_user_id ON enrollment(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_course_id ON enrollment(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_user_course ON enrollment(user_id, course_id);

-- Index for section lookups by course_id (used in section queries)
CREATE INDEX IF NOT EXISTS idx_section_course_id ON section(course_id);
CREATE INDEX IF NOT EXISTS idx_section_course_order ON section(course_id, section_order);

-- Index for lesson lookups by section_id
CREATE INDEX IF NOT EXISTS idx_lesson_section_id ON lesson(section_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_order ON lesson(section_id, lesson_order);

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscription_user_id ON subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);
CREATE INDEX IF NOT EXISTS idx_subscription_end_date ON subscription(subscription_end_date) WHERE status = 'active';

-- Index for user_subscription joins
CREATE INDEX IF NOT EXISTS idx_user_subscription_user_id ON user_subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscription_subscription_id ON user_subscription(subscription_id);

-- Index for support ticket lookups
CREATE INDEX IF NOT EXISTS idx_support_user_email ON support(user_email);
CREATE INDEX IF NOT EXISTS idx_support_status ON support(status);
CREATE INDEX IF NOT EXISTS idx_support_created_at ON support(created_at DESC);

-- Index for ticket messages
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sent_at ON ticket_messages(sent_at);

-- Index for feedback queries
CREATE INDEX IF NOT EXISTS idx_feedback_course_id ON feedback(course_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Index for refresh tokens (authentication)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- Index for course status lookups
CREATE INDEX IF NOT EXISTS idx_course_status ON course(status);

-- Index for admins lookup (frequently checked)
CREATE INDEX IF NOT EXISTS idx_admins_admin_id ON admins(admin_id);

-- Index for recent_activity queries
CREATE INDEX IF NOT EXISTS idx_recent_activity_user_id ON recent_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_activity_timestamp ON recent_activity(timestamp DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_streak_update ON users(user_id, last_streak_update, last_visit);

-- Analyze tables to update statistics after creating indexes
ANALYZE users;
ANALYZE user_sessions;
ANALYZE lesson_progress;
ANALYZE enrollment;
ANALYZE section;
ANALYZE lesson;
ANALYZE subscription;
ANALYZE user_subscription;
ANALYZE support;
ANALYZE ticket_messages;
ANALYZE feedback;
ANALYZE refresh_tokens;
ANALYZE course;
ANALYZE admins;
ANALYZE recent_activity;

-- Output confirmation
SELECT 'Performance indexes created successfully' AS status;
