-- ============================================================
-- TransAI v2.6 Migration: Remove duplicates + add UNIQUE KEYs
-- ============================================================
USE trans_ai_bd;

-- ============================================================
-- 1. ai_analysis: keep one row per (rm_id, col_name)
-- ============================================================

-- Add updated_at if missing
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_analysis' AND COLUMN_NAME = 'updated_at') = 0,
  'ALTER TABLE ai_analysis ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Delete duplicates: keep row with MAX(id) per (rm_id, col_name)
DELETE a1 FROM ai_analysis a1
INNER JOIN ai_analysis a2
  ON a1.rm_id = a2.rm_id AND a1.col_name = a2.col_name AND a1.id < a2.id;

-- ============================================================
-- 2. ai_reasoning: keep one row per rm_id
-- ============================================================

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_reasoning' AND COLUMN_NAME = 'updated_at') = 0,
  'ALTER TABLE ai_reasoning ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Delete duplicates: keep row with MAX(id) per rm_id
DELETE a1 FROM ai_reasoning a1
INNER JOIN ai_reasoning a2
  ON a1.rm_id = a2.rm_id AND a1.id < a2.id;

-- ============================================================
-- 3. projects: PHYSICALLY DELETE duplicates (keep MIN id per rm_id)
-- ============================================================
-- We must PHYSICALLY delete because UNIQUE KEY on rm_id
-- will reject duplicates even if is_deleted=1.

-- 3a. Create temp table with ids to keep
CREATE TEMPORARY TABLE IF NOT EXISTS _keep_project_ids (
  keep_id INT PRIMARY KEY
) ENGINE=MEMORY;

TRUNCATE TABLE _keep_project_ids;

-- Insert MIN(id) for each rm_id into temp table
INSERT INTO _keep_project_ids (keep_id)
SELECT MIN(id)
FROM projects
WHERE rm_id > 0
GROUP BY rm_id;

-- Also handle rm_id = 0: keep MIN(id) per (name, department)
INSERT INTO _keep_project_ids (keep_id)
SELECT MIN(id)
FROM projects
WHERE rm_id = 0
GROUP BY name, department
ON DUPLICATE KEY UPDATE keep_id = keep_id;

-- 3b. Count before
SELECT 'Projects before cleanup' as status, COUNT(*) as total FROM projects;

-- 3c. Delete projects whose id is NOT in keep table
DELETE FROM projects WHERE id NOT IN (SELECT keep_id FROM _keep_project_ids);

-- 3d. Drop temp table
DROP TEMPORARY TABLE _keep_project_ids;

-- Show count after
SELECT 'Projects after cleanup' as status, COUNT(*) as total FROM projects;

-- ============================================================
-- 4. Add updated_at to projects if missing
-- ============================================================
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'updated_at') = 0,
  'ALTER TABLE projects ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 5. Add UNIQUE KEYs
-- ============================================================

-- Drop old non-unique indexes to avoid conflicts
DROP INDEX IF EXISTS idx_rm_id ON projects;
DROP INDEX IF EXISTS idx_rm_id ON ai_analysis;

-- UNIQUE KEY on projects.rm_id
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND INDEX_NAME = 'uq_rm_id') = 0,
  'ALTER TABLE projects ADD UNIQUE KEY uq_rm_id (rm_id)',
  'SELECT "uq_rm_id already exists" as msg'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- UNIQUE KEY on ai_analysis (rm_id, col_name)
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_analysis' AND INDEX_NAME = 'uq_rm_col') = 0,
  'ALTER TABLE ai_analysis ADD UNIQUE KEY uq_rm_col (rm_id, col_name)',
  'SELECT "uq_rm_col already exists" as msg'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- UNIQUE KEY on ai_reasoning.rm_id
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_reasoning' AND INDEX_NAME = 'uq_rm_id') = 0,
  'ALTER TABLE ai_reasoning ADD UNIQUE KEY uq_rm_id (rm_id)',
  'SELECT "uq_rm_id on ai_reasoning already exists" as msg'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 6. Final counts
-- ============================================================
SELECT '=== FINAL STATE ===' as section;
SELECT 'projects' as tbl, COUNT(*) as cnt FROM projects
UNION ALL SELECT 'ai_analysis', COUNT(*) FROM ai_analysis
UNION ALL SELECT 'ai_reasoning', COUNT(*) FROM ai_reasoning;
