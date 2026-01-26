-- Migration: Add batch_id column to alerts table
-- Run this SQL script manually if you prefer SQL over Node.js migration

-- Step 1: Add batch_id column
ALTER TABLE alerts 
ADD COLUMN batch_id INT NULL;

-- Step 2: Add foreign key constraint
ALTER TABLE alerts 
ADD CONSTRAINT fk_alerts_batch_id 
FOREIGN KEY (batch_id) 
REFERENCES batches(batch_id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Step 3: Add index for better query performance
CREATE INDEX idx_alerts_batch_id ON alerts(batch_id);

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'alerts' 
AND COLUMN_NAME = 'batch_id';

