-- Support System Enhancement Schema
-- Add columns for improved ticket management

-- Add new columns to support table
ALTER TABLE support 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255),
ADD COLUMN IF NOT EXISTS sla_target TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolution_time INTERVAL,
ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5);

-- Add new column to ticket_messages table
ALTER TABLE ticket_messages 
ADD COLUMN IF NOT EXISTS is_auto_response BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_category ON support(category);
CREATE INDEX IF NOT EXISTS idx_support_priority ON support(priority);
CREATE INDEX IF NOT EXISTS idx_support_assigned_to ON support(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_sla_target ON support(sla_target);
CREATE INDEX IF NOT EXISTS idx_support_status_time ON support(status, time_opened);

-- Create view for support analytics
CREATE OR REPLACE VIEW support_analytics AS
SELECT 
    category,
    priority,
    status,
    COUNT(*) as ticket_count,
    AVG(EXTRACT(EPOCH FROM resolution_time)) as avg_resolution_seconds,
    AVG(satisfaction_rating) as avg_satisfaction,
    COUNT(CASE WHEN sla_target < NOW() THEN 1 END) as overdue_count
FROM support 
WHERE time_opened >= NOW() - INTERVAL '30 days'
GROUP BY category, priority, status;

-- Create function to calculate response time
CREATE OR REPLACE FUNCTION calculate_first_response_time(ticket_id_param INTEGER)
RETURNS INTERVAL AS $$
DECLARE
    ticket_created TIMESTAMP WITH TIME ZONE;
    first_admin_response TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get ticket creation time
    SELECT time_opened INTO ticket_created 
    FROM support 
    WHERE ticket_id = ticket_id_param;
    
    -- Get first admin response time
    SELECT MIN(timestamp) INTO first_admin_response
    FROM ticket_messages 
    WHERE ticket_id = ticket_id_param 
    AND sender_type = 'admin'
    AND is_auto_response = FALSE;
    
    -- Return the difference
    IF first_admin_response IS NOT NULL THEN
        RETURN first_admin_response - ticket_created;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update resolution time when ticket is closed
CREATE OR REPLACE FUNCTION update_resolution_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        NEW.resolution_time = NOW() - NEW.time_opened;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_resolution_time ON support;
CREATE TRIGGER trigger_update_resolution_time
    BEFORE UPDATE ON support
    FOR EACH ROW
    EXECUTE FUNCTION update_resolution_time();

COMMENT ON TABLE support IS 'Enhanced support ticket system with categorization, priority, and SLA tracking';
COMMENT ON COLUMN support.category IS 'Auto-categorized ticket type: billing, technical, course, general';
COMMENT ON COLUMN support.priority IS 'Ticket priority: low, medium, high';
COMMENT ON COLUMN support.assigned_to IS 'Email of assigned support agent or team';
COMMENT ON COLUMN support.sla_target IS 'Target resolution time based on category and priority';
COMMENT ON COLUMN support.resolution_time IS 'Actual time taken to resolve the ticket';
COMMENT ON COLUMN support.satisfaction_rating IS 'User satisfaction rating 1-5 stars';
