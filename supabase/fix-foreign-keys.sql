-- Fix foreign key constraints to enable CASCADE DELETE
-- This fixes the conversation deletion issues

-- Drop existing foreign key constraints
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_conversation_id_fkey;
ALTER TABLE file_uploads DROP CONSTRAINT IF EXISTS file_uploads_user_id_fkey;

-- Recreate with CASCADE DELETE
ALTER TABLE messages 
ADD CONSTRAINT messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE chat_sessions 
ADD CONSTRAINT chat_sessions_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Keep file_uploads reference to profiles (not conversations)
ALTER TABLE file_uploads 
ADD CONSTRAINT file_uploads_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also add CASCADE for parent_id in messages (for branching)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_parent_id_fkey;
ALTER TABLE messages 
ADD CONSTRAINT messages_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE;

-- Add cascade for conversations -> profiles reference  
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;
ALTER TABLE conversations 
ADD CONSTRAINT conversations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Clean up any orphaned chat_sessions first
DELETE FROM chat_sessions 
WHERE conversation_id NOT IN (SELECT id FROM conversations);

-- Clean up any orphaned messages
DELETE FROM messages 
WHERE conversation_id NOT IN (SELECT id FROM conversations);

-- Add some helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_conversation_id ON chat_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);