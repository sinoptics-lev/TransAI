-- ============================================================
-- TransAI v2.6 Migration Script
-- Remove duplicates and add UNIQUE KEYs
-- RUN BEFORE FIRST v2.6 UPLOAD
-- ============================================================

USE trans_ai_bd;

-- ============================================================
-- 1. Clean duplicates in ai_analysis — keep latest by updated_at
-- ============================================================

-- Add updated_at if not exists
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_analysis' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE ai_analysis ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT "updated_at already exists in ai_analysis" as msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Delete duplicates (keep row with MAX updated_at, or MAX id as tie-breaker)
DELETE a1 FROM ai_analysis a1
INNER JOIN ai_analysis a2
  ON a1.rm_id = a2.rm_id AND a1.col_name = a2.col_name AND a1.id < a2.id;

-- ============================================================
-- 2. Clean duplicates in ai_reasoning — keep latest by updated_at
-- ============================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_reasoning' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE ai_reasoning ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT "updated_at already exists in ai_reasoning" as msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Delete duplicates
DELETE a1 FROM ai_reasoning a1
INNER JOIN ai_reasoning a2
  ON a1.rm_id = a2.rm_id AND a1.id < a2.id;

-- ============================================================
-- 3. Clean duplicates in projects — keep non-deleted, then latest
-- ============================================================

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE projects ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT "updated_at already exists in projects" as msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Mark duplicates (keep first non-deleted, or first by id)
UPDATE projects p1
JOIN (
  SELECT rm_id, MIN(id) as keep_id
  FROM projects
  WHERE rm_id > 0
  GROUP BY rm_id
  HAVING COUNT(*) > 1
) keep ON p1.rm_id = keep.rm_id AND p1.id > keep.keep_id
SET p1.is_deleted = 1, p1.deleted_at = NOW();

-- ============================================================
-- 4. Add UNIQUE KEYs (run after cleaning)
-- ============================================================

-- projects: UNIQUE on rm_id
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND INDEX_NAME = 'uq_rm_id');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE projects ADD UNIQUE KEY uq_rm_id (rm_id)',
  'SELECT "uq_rm_id already exists" as msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ai_analysis: UNIQUE on (rm_id, col_name)
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_analysis' AND INDEX_NAME = 'uq_rm_col');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE ai_analysis ADD UNIQUE KEY uq_rm_col (rm_id, col_name)',
  'SELECT "uq_rm_col already exists" as msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ai_reasoning: UNIQUE on rm_id
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_reasoning' AND INDEX_NAME = 'uq_rm_id');
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE ai_reasoning ADD UNIQUE KEY uq_rm_id (rm_id)',
  'SELECT "uq_rm_id already exists on ai_reasoning" as msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 5. Verify counts
-- ============================================================
SELECT 'Projects' as table_name, COUNT(*) as total, SUM(is_deleted) as deleted FROM projects
UNION ALL
SELECT 'AI Analysis', COUNT(*), SUM(is_deleted) FROM ai_analysis
UNION ALL
SELECT 'AI Reasoning', COUNT(*), 0 FROM ai_reasoning;
