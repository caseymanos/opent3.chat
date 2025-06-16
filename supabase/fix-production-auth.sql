-- Fix production authentication and foreign key issues
-- This script allows session-based users without profiles

-- First, drop the foreign key constraint that's causing issues
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE file_uploads DROP CONSTRAINT IF EXISTS file_uploads_user_id_fkey;
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow demo user conversations" ON conversations;
DROP POLICY IF EXISTS "Allow demo user messages" ON messages;
DROP POLICY IF EXISTS "Allow demo user profile" ON profiles;
DROP POLICY IF EXISTS "Allow demo user sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Enable all operations for conversation owners" ON conversations;
DROP POLICY IF EXISTS "Enable all operations for conversation participants" ON messages;
DROP POLICY IF EXISTS "Enable all operations for profile owners" ON profiles;
DROP POLICY IF EXISTS "Enable all operations for session owners" ON chat_sessions;
DROP POLICY IF EXISTS "Enable all operations for file owners" ON file_uploads;

-- Create permissive policies that allow all operations
-- This is for demo/development purposes

-- Conversations - Allow all operations
CREATE POLICY "Allow all conversation operations" ON conversations
FOR ALL 
USING (true)
WITH CHECK (true);

-- Messages - Allow all operations
CREATE POLICY "Allow all message operations" ON messages
FOR ALL 
USING (true)
WITH CHECK (true);

-- Profiles - Allow all operations
CREATE POLICY "Allow all profile operations" ON profiles
FOR ALL
USING (true)
WITH CHECK (true);

-- Chat sessions - Allow all operations
CREATE POLICY "Allow all session operations" ON chat_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- File uploads - Allow all operations
CREATE POLICY "Allow all file operations" ON file_uploads
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_conversation_id ON chat_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Add a comment explaining the security model
COMMENT ON POLICY "Allow all conversation operations" ON conversations IS 'Demo mode - allows all operations without authentication';
COMMENT ON POLICY "Allow all message operations" ON messages IS 'Demo mode - allows all operations without authentication';
COMMENT ON POLICY "Allow all profile operations" ON profiles IS 'Demo mode - allows all operations without authentication';
COMMENT ON POLICY "Allow all session operations" ON chat_sessions IS 'Demo mode - allows all operations without authentication';
COMMENT ON POLICY "Allow all file operations" ON file_uploads IS 'Demo mode - allows all operations without authentication';