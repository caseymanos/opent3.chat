-- Fix authentication policies for production
-- Allow both authenticated users and session-based users

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

-- Conversations policies - Allow any user_id (authenticated or session-based)
CREATE POLICY "Enable all operations for conversation owners" ON conversations
FOR ALL 
USING (
  -- Allow if authenticated user matches
  auth.uid() = user_id 
  OR 
  -- Allow any non-null user_id for demo/session users
  (auth.uid() IS NULL AND user_id IS NOT NULL)
)
WITH CHECK (
  -- Allow if authenticated user matches
  auth.uid() = user_id 
  OR 
  -- Allow any non-null user_id for demo/session users
  (auth.uid() IS NULL AND user_id IS NOT NULL)
);

-- Messages policies - Based on conversation ownership
CREATE POLICY "Enable all operations for conversation participants" ON messages
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      conversations.user_id = auth.uid() 
      OR 
      (auth.uid() IS NULL AND conversations.user_id IS NOT NULL)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      conversations.user_id = auth.uid() 
      OR 
      (auth.uid() IS NULL AND conversations.user_id IS NOT NULL)
    )
  )
);

-- Profiles policies
CREATE POLICY "Enable all operations for profile owners" ON profiles
FOR ALL
USING (
  auth.uid() = id 
  OR 
  (auth.uid() IS NULL AND id IS NOT NULL)
)
WITH CHECK (
  auth.uid() = id 
  OR 
  (auth.uid() IS NULL AND id IS NOT NULL)
);

-- Chat sessions policies
CREATE POLICY "Enable all operations for session owners" ON chat_sessions
FOR ALL
USING (
  auth.uid() = user_id 
  OR 
  (auth.uid() IS NULL AND user_id IS NOT NULL)
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  (auth.uid() IS NULL AND user_id IS NOT NULL)
);

-- File uploads policies
CREATE POLICY "Enable all operations for file owners" ON file_uploads
FOR ALL
USING (
  auth.uid() = user_id 
  OR 
  (auth.uid() IS NULL AND user_id IS NOT NULL)
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  (auth.uid() IS NULL AND user_id IS NOT NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_conversation_id ON chat_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);