-- Migration: Create batch_disposals table
-- Run this SQL script manually to create the batch_disposals table

-- Create batch_disposals table
CREATE TABLE IF NOT EXISTS batch_disposals (
  disposal_id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  disposal_qty INT NOT NULL,
  disposal_reason VARCHAR(200) NOT NULL,
  disposal_method VARCHAR(100) NULL,
  disposal_date DATE NOT NULL,
  disposal_cost DECIMAL(12, 2) DEFAULT 0.00,
  remarks TEXT NULL,
  disposed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_batch_disposals_batch_id 
    FOREIGN KEY (batch_id) 
    REFERENCES batches(batch_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
    
  CONSTRAINT fk_batch_disposals_disposed_by 
    FOREIGN KEY (disposed_by) 
    REFERENCES users(user_id) 
    ON DELETE RESTRICT 
    ON UPDATE CASCADE,
    
  -- Check constraint for disposal_qty
  CONSTRAINT chk_disposal_qty_positive 
    CHECK (disposal_qty > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better query performance
CREATE INDEX idx_batch_disposals_batch_id ON batch_disposals(batch_id);
CREATE INDEX idx_batch_disposals_disposed_by ON batch_disposals(disposed_by);
CREATE INDEX idx_batch_disposals_disposal_date ON batch_disposals(disposal_date);

-- Verify the table was created
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'batch_disposals';

