-- FORCE App: Supabase Schema
-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  goal TEXT,
  context_type TEXT,
  confidence_level TEXT,
  streak_days INTEGER DEFAULT 0,
  last_completed_date DATE,
  total_completions INTEGER DEFAULT 0
);

-- Sessions table (one per day per user)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  day_number INTEGER,
  move TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completion_strength TEXT, -- 'strong' | 'weak' | 'no'
  reflection_input TEXT,
  reflection_output TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (simple open policy for MVP)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_date_idx ON sessions(date);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
