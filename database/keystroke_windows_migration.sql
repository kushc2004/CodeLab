-- Migration to add time-windowed keystroke tracking
-- This adds a new table for 100ms time window keystroke aggregation

-- New table for time-windowed keystroke data
CREATE TABLE IF NOT EXISTS keystroke_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    window_start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    window_end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    keystrokes_data JSONB NOT NULL, -- Array of all keystrokes in this window
    cursor_position_start INTEGER,
    cursor_position_end INTEGER,
    code_snapshot_start TEXT,
    code_snapshot_end TEXT,
    total_keystrokes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_keystroke_windows_session_id ON keystroke_windows(session_id);
CREATE INDEX IF NOT EXISTS idx_keystroke_windows_start_time ON keystroke_windows(window_start_time);
CREATE INDEX IF NOT EXISTS idx_keystroke_windows_end_time ON keystroke_windows(window_end_time);

-- Enable RLS
ALTER TABLE keystroke_windows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow keystroke windows insertion" ON keystroke_windows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow keystroke windows viewing" ON keystroke_windows FOR SELECT USING (true);

-- Comment on the table
COMMENT ON TABLE keystroke_windows IS 'Stores keystroke data aggregated by 100ms time windows for research analysis';
COMMENT ON COLUMN keystroke_windows.keystrokes_data IS 'JSONB array containing all keystrokes that occurred within the time window: [{key, action, timestamp_offset, cursor_position}, ...]';
COMMENT ON COLUMN keystroke_windows.window_start_time IS 'Start time of the 100ms window';
COMMENT ON COLUMN keystroke_windows.window_end_time IS 'End time of the 100ms window';
COMMENT ON COLUMN keystroke_windows.total_keystrokes IS 'Total number of keystrokes in this window for quick aggregation';
