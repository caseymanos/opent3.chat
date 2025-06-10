-- Add collaborative features to existing schema

-- Conversation participants for shared conversations
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'participant' CHECK (role IN ('owner', 'admin', 'participant')),
  permissions JSONB DEFAULT '{"read": true, "write": true, "share": false}',
  joined_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Real-time cursors and selections for collaborative editing
CREATE TABLE live_cursors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cursor_position JSONB, -- {position: number, messageId?: string}
  selection JSONB, -- {start: number, end: number, messageId?: string}
  is_typing BOOLEAN DEFAULT FALSE,
  typing_in_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Collaborative annotations and highlights
CREATE TABLE message_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  annotation_type TEXT CHECK (annotation_type IN ('highlight', 'comment', 'reaction', 'bookmark')),
  content JSONB, -- annotation data
  position JSONB, -- text selection position
  color TEXT DEFAULT '#ffeb3b',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shared conversation invites
CREATE TABLE conversation_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email TEXT,
  token UUID DEFAULT gen_random_uuid(),
  permissions JSONB DEFAULT '{"read": true, "write": true, "share": false}',
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation participants
CREATE POLICY "Users can view participants of their conversations" ON conversation_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_participants.conversation_id 
    AND conversations.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Conversation owners can manage participants" ON conversation_participants FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_participants.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- RLS Policies for live cursors
CREATE POLICY "Users can view cursors in accessible conversations" ON live_cursors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = live_cursors.conversation_id 
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own cursors" ON live_cursors FOR ALL USING (user_id = auth.uid());

-- RLS Policies for annotations
CREATE POLICY "Users can view annotations in accessible conversations" ON message_annotations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages 
    JOIN conversation_participants ON messages.conversation_id = conversation_participants.conversation_id
    WHERE messages.id = message_annotations.message_id 
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own annotations" ON message_annotations FOR ALL USING (user_id = auth.uid());

-- RLS Policies for invites
CREATE POLICY "Users can view invites they sent or received" ON conversation_invites FOR SELECT USING (
  inviter_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = conversation_invites.invitee_email
  )
);

CREATE POLICY "Users can create invites for own conversations" ON conversation_invites FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = conversation_invites.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- Enable realtime for collaborative tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE live_cursors;
ALTER PUBLICATION supabase_realtime ADD TABLE message_annotations;

-- Indexes for performance
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_live_cursors_conversation_id ON live_cursors(conversation_id);
CREATE INDEX idx_live_cursors_updated_at ON live_cursors(updated_at);
CREATE INDEX idx_message_annotations_message_id ON message_annotations(message_id);
CREATE INDEX idx_conversation_invites_token ON conversation_invites(token);

-- Functions for cursor cleanup (remove stale cursors)
CREATE OR REPLACE FUNCTION cleanup_stale_cursors()
RETURNS void AS $$
BEGIN
  DELETE FROM live_cursors 
  WHERE updated_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to auto-accept invites when user signs up
CREATE OR REPLACE FUNCTION auto_accept_invites()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-accept any pending invites for this email
  INSERT INTO conversation_participants (conversation_id, user_id, role, permissions)
  SELECT 
    ci.conversation_id,
    NEW.id,
    'participant',
    ci.permissions
  FROM conversation_invites ci
  WHERE ci.invitee_email = NEW.email
    AND ci.accepted_at IS NULL
    AND ci.expires_at > NOW();
  
  -- Mark invites as accepted
  UPDATE conversation_invites 
  SET accepted_at = NOW()
  WHERE invitee_email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-accepting invites
CREATE TRIGGER trigger_auto_accept_invites
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_accept_invites();

-- Update conversations policies to support shared conversations
DROP POLICY "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view accessible conversations" ON conversations FOR SELECT USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = conversations.id 
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Update messages policies for shared conversations
DROP POLICY "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in accessible conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      conversations.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_participants.conversation_id = conversations.id 
        AND conversation_participants.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY "Users can create messages in own conversations" ON messages;
CREATE POLICY "Users can create messages in accessible conversations" ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      conversations.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_participants.conversation_id = conversations.id 
        AND conversation_participants.user_id = auth.uid()
        AND (conversation_participants.permissions->>'write')::boolean = true
      )
    )
  )
);