-- Temporarily disable RLS for development
-- This allows the demo user to work without full authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

-- Create more permissive policies for development
CREATE POLICY "Allow demo user conversations" ON conversations 
FOR ALL 
USING (
  user_id = '00000000-0000-0000-0000-000000000001' OR
  auth.uid() = user_id
)
WITH CHECK (
  user_id = '00000000-0000-0000-0000-000000000001' OR
  auth.uid() = user_id
);

-- Update messages policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;

CREATE POLICY "Allow demo user messages" ON messages
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.user_id = '00000000-0000-0000-0000-000000000001' OR conversations.user_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (conversations.user_id = '00000000-0000-0000-0000-000000000001' OR conversations.user_id = auth.uid())
  )
);

-- Update profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Allow demo user profile" ON profiles
FOR ALL
USING (
  id = '00000000-0000-0000-0000-000000000001' OR
  auth.uid() = id
)
WITH CHECK (
  id = '00000000-0000-0000-0000-000000000001' OR
  auth.uid() = id
);

-- Update chat sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON chat_sessions;

CREATE POLICY "Allow demo user sessions" ON chat_sessions
FOR ALL
USING (
  user_id = '00000000-0000-0000-0000-000000000001' OR
  auth.uid() = user_id
)
WITH CHECK (
  user_id = '00000000-0000-0000-0000-000000000001' OR
  auth.uid() = user_id
);