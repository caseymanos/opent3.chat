-- Add special_calls_used column to profiles table for Claude 4 Sonnet tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS special_calls_used INTEGER DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.special_calls_used IS 'Number of special tier model calls used (e.g., Claude 4 Sonnet - limit 2)';