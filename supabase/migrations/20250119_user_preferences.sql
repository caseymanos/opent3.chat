-- Add user preferences table for storing traits and settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  occupation TEXT,
  personality_traits TEXT[] DEFAULT '{}',
  additional_context TEXT,
  model_instructions JSONB DEFAULT '{}',
  export_settings JSONB DEFAULT '{"format": "json", "includeMetadata": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences" 
  ON user_preferences FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" 
  ON user_preferences FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" 
  ON user_preferences FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" 
  ON user_preferences FOR DELETE 
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add default traits column to profiles table (optional)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS traits_enabled BOOLEAN DEFAULT true;