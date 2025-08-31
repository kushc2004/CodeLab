-- Migration script to update timestamp column from BIGINT to TIMESTAMP WITHOUT TIME ZONE

-- Step 1: Add new timestamp column
ALTER TABLE keystrokes ADD COLUMN timestamp_new TIMESTAMP WITHOUT TIME ZONE;

-- Step 2: Update the new column with converted values (assuming existing timestamps are Unix milliseconds)
UPDATE keystrokes 
SET timestamp_new = to_timestamp(timestamp / 1000.0);

-- Step 3: Drop the old column
ALTER TABLE keystrokes DROP COLUMN timestamp;

-- Step 4: Rename the new column
ALTER TABLE keystrokes RENAME COLUMN timestamp_new TO timestamp;

-- Step 5: Add NOT NULL constraint
ALTER TABLE keystrokes ALTER COLUMN timestamp SET NOT NULL;

-- Step 6: Update the index
DROP INDEX IF EXISTS idx_keystrokes_timestamp;
CREATE INDEX idx_keystrokes_timestamp ON keystrokes(timestamp);
