-- Enable the pgcrypto extension to generate random UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversations with branching support
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  user_id UUID REFERENCES profiles(id),
  model_provider TEXT DEFAULT 'openai',
  model_name TEXT DEFAULT 'gpt-4',
  system_prompt TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages with tree structure for branching
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  parent_id UUID REFERENCES messages(id) NULL,
  content JSONB, -- Support rich content
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  model_metadata JSONB, -- tokens, cost, etc.
  attachments JSONB, -- file references
  created_at TIMESTAMP DEFAULT NOW(),
  branch_index INTEGER DEFAULT 0
);

-- File uploads
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  filename TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size BIGINT,
  processed_data JSONB, -- OCR, embeddings, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chat sessions for real-time presence
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  conversation_id UUID REFERENCES conversations(id),
  status TEXT DEFAULT 'active',
  last_seen TIMESTAMP DEFAULT NOW(),
  typing_indicator BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create messages in own conversations" ON messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update messages in own conversations" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- File uploads policies
CREATE POLICY "Users can view own files" ON file_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own files" ON file_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own files" ON file_uploads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own files" ON file_uploads FOR DELETE USING (auth.uid() = user_id);

-- Chat sessions policies
CREATE POLICY "Users can view own sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_parent_id ON messages(parent_id);
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_chat_sessions_conversation_id ON chat_sessions(conversation_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);