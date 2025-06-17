-- Add usage tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_calls_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS byok_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS api_keys JSONB DEFAULT '{}';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own usage data" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own usage data" ON public.profiles;

-- Create or replace RLS policies to allow users to read and update their own usage data
CREATE POLICY "Users can view own usage data" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own usage data" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);