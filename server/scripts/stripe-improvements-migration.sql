-- Stripe Integration Improvements - Database Migration
-- Date: 2025-01-05
-- Purpose: Update subscription statuses to match new Stripe integration standards

-- 1. Ensure stripe_customer_id column exists in users table
-- (Skip if already exists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- 2. Add index for faster customer lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id 
ON users(stripe_customer_id);

-- 3. Update existing subscriptions from 'Completed' to 'active'
-- This ensures consistency with new Stripe status values
UPDATE subscription 
SET status = 'active' 
WHERE status = 'Completed' 
  AND subscription_end_date > CURRENT_TIMESTAMP;

-- 4. Mark expired 'Completed' subscriptions as 'cancelled'
UPDATE subscription 
SET status = 'cancelled' 
WHERE status = 'Completed' 
  AND subscription_end_date <= CURRENT_TIMESTAMP;

-- 5. Add index for faster status lookups with new IN clause queries
CREATE INDEX IF NOT EXISTS idx_subscription_status_enddate 
ON subscription(status, subscription_end_date);

-- 6. Add unique constraint on stripe_subscription_id to prevent duplicates
-- This helps with webhook idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_stripe_id 
ON subscription(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- 7. Verify data migration
-- Run these queries to check the migration results:

-- Check status distribution
SELECT status, COUNT(*) as count, 
       COUNT(CASE WHEN subscription_end_date > CURRENT_TIMESTAMP THEN 1 END) as active_count,
       COUNT(CASE WHEN subscription_end_date <= CURRENT_TIMESTAMP THEN 1 END) as expired_count
FROM subscription 
GROUP BY status;

-- Check users with subscriptions but missing stripe_customer_id
SELECT COUNT(*) as users_missing_customer_id
FROM users u
INNER JOIN user_subscription us ON u.user_id = us.user_id
WHERE u.stripe_customer_id IS NULL;

-- Check for any duplicate stripe_subscription_id values before adding constraint
SELECT stripe_subscription_id, COUNT(*) as count
FROM subscription
WHERE stripe_subscription_id IS NOT NULL
GROUP BY stripe_subscription_id
HAVING COUNT(*) > 1;

-- If duplicates exist, you'll need to manually resolve them before running step 6
-- Example query to find duplicate details:
-- SELECT *
-- FROM subscription
-- WHERE stripe_subscription_id IN (
--   SELECT stripe_subscription_id
--   FROM subscription
--   WHERE stripe_subscription_id IS NOT NULL
--   GROUP BY stripe_subscription_id
--   HAVING COUNT(*) > 1
-- )
-- ORDER BY stripe_subscription_id, subscription_start_date DESC;

-- Migration complete!
