-- Fix RLS policies for messages table to prevent "new row violates row-level security policy" errors

-- First, ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on messages
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Allow demo user messages" ON messages;

-- Create a single comprehensive policy for messages
CREATE POLICY "messages_policy" ON messages
FOR ALL
USING (
  -- Allow access if the conversation belongs to the user OR it's the demo user
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.user_id = auth.uid() -- Authenticated user
      OR conversations.user_id = '00000000-0000-0000-0000-000000000001' -- Demo user
      OR auth.uid() IS NULL -- Allow for anonymous/service operations
    )
  )
)
WITH CHECK (
  -- Same check for inserts/updates
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (
      conversations.user_id = auth.uid() -- Authenticated user
      OR conversations.user_id = '00000000-0000-0000-0000-000000000001' -- Demo user
      OR auth.uid() IS NULL -- Allow for anonymous/service operations
    )
  )
);

-- Also ensure conversations table has proper policies
DROP POLICY IF EXISTS "Allow demo user conversations" ON conversations;

CREATE POLICY "conversations_policy" ON conversations
FOR ALL
USING (
  user_id = auth.uid() -- Authenticated user
  OR user_id = '00000000-0000-0000-0000-000000000001' -- Demo user
  OR auth.uid() IS NULL -- Allow for anonymous/service operations
)
WITH CHECK (
  user_id = auth.uid() -- Authenticated user
  OR user_id = '00000000-0000-0000-0000-000000000001' -- Demo user
  OR auth.uid() IS NULL -- Allow for anonymous/service operations
);

-- Grant necessary permissions
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO anon;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversations TO anon;