-- Supabase Database Schema for Coding Platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    problem_id UUID DEFAULT NULL, -- Optional for future problem-based sessions
    language VARCHAR(10) NOT NULL CHECK (language IN ('cpp', 'python')),
    code TEXT DEFAULT '',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Keystrokes table for research data
CREATE TABLE IF NOT EXISTS keystrokes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL, -- DateTime format instead of Unix timestamp
    key VARCHAR(50) NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('keydown', 'keyup', 'input')),
    cursor_position INTEGER NOT NULL,
    code_snapshot TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Code executions table
CREATE TABLE IF NOT EXISTS code_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    language VARCHAR(10) NOT NULL CHECK (language IN ('cpp', 'python')),
    output TEXT,
    error TEXT,
    execution_time INTEGER, -- in milliseconds
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_keystrokes_session_id ON keystrokes(session_id);
CREATE INDEX IF NOT EXISTS idx_keystrokes_timestamp ON keystrokes(timestamp);
CREATE INDEX IF NOT EXISTS idx_code_executions_session_id ON code_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE keystrokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (true);

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE USING (true);

-- Keystrokes policies (for research data collection)
CREATE POLICY "Allow keystroke insertion" ON keystrokes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow keystroke viewing" ON keystrokes FOR SELECT USING (true);

-- Code executions policies
CREATE POLICY "Allow code execution insertion" ON code_executions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow code execution viewing" ON code_executions FOR SELECT USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
