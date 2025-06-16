-- Remove ALL constraints and enable permissive access for hackathon demo
-- WARNING: This is NOT secure for production use!

-- Drop all foreign key constraints
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_parent_id_fkey;
ALTER TABLE file_uploads DROP CONSTRAINT IF EXISTS file_uploads_user_id_fkey;
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_conversation_id_fkey;

-- Disable RLS completely for demo
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to anonymous users
GRANT ALL ON conversations TO anon;
GRANT ALL ON messages TO anon;
GRANT ALL ON profiles TO anon;
GRANT ALL ON file_uploads TO anon;
GRANT ALL ON chat_sessions TO anon;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Make sure the anon role can use the public schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT CREATE ON SCHEMA public TO anon;