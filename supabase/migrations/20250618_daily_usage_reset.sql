-- Update usage tracking to support daily resets
-- This migration updates the usage_last_reset to track daily resets instead of monthly

-- First, reset all existing usage counters to start fresh with the new daily system
UPDATE public.profiles
SET 
  premium_calls_used = 0,
  special_calls_used = 0,
  usage_last_reset = NOW()
WHERE usage_last_reset IS NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN public.profiles.usage_last_reset IS 'Timestamp of the last usage reset. Resets daily at midnight UTC for the new tier system.';
COMMENT ON COLUMN public.profiles.premium_calls_used IS 'Number of premium tier calls used in the current day. Limit is 18 for logged-in users.';
COMMENT ON COLUMN public.profiles.special_calls_used IS 'Number of special tier calls (Claude 4 Sonnet) used in the current day. Limit is 2 for logged-in users.';

-- Create an index on usage_last_reset for faster daily reset checks
CREATE INDEX IF NOT EXISTS idx_profiles_usage_last_reset ON public.profiles(usage_last_reset);