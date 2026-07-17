-- ============================================================
-- Migration v2.6.4 — Fix ai_reasoning table structure
--
-- Problem: old schema_ai_reasoning.sql created the table with
--   UNIQUE KEY uk_project (project_id) and project_id INT NOT NULL,
-- while ai_reasoning.php upserts by rm_id without project_id.
-- Result: saves either failed (strict mode) or overwrote each
-- other on project_id = 0.
--
-- This migration is IDEMPOTENT: safe to run multiple times and
-- on tables already created from the correct schema.sql.
-- Run in phpMyAdmin / MySQL client after selecting trans_ai_bd.
-- ============================================================

USE trans_ai_bd;

-- 1) Remove duplicate rows per rm_id (keep the newest)
DELETE t1 FROM ai_reasoning t1
INNER JOIN ai_reasoning t2 ON t1.rm_id = t2.rm_id AND t1.id < t2.id;

-- 2) Drop the wrong unique key uk_project (if it exists)
SELECT COUNT(*) INTO @cnt FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'ai_reasoning' AND index_name = 'uk_project';
SET @sql = IF(@cnt > 0, 'ALTER TABLE ai_reasoning DROP INDEX uk_project', 'SELECT 1 AS step2_skipped');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 3) Make project_id nullable with default (if the column exists)
SELECT COUNT(*) INTO @cnt FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'ai_reasoning' AND column_name = 'project_id';
SET @sql = IF(@cnt > 0, 'ALTER TABLE ai_reasoning MODIFY project_id INT NULL DEFAULT NULL', 'SELECT 1 AS step3_skipped');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 4) Ensure the correct unique key on rm_id exists
SELECT COUNT(*) INTO @cnt FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'ai_reasoning' AND index_name = 'uq_rm_id';
SET @sql = IF(@cnt = 0, 'ALTER TABLE ai_reasoning ADD UNIQUE KEY uq_rm_id (rm_id)', 'SELECT 1 AS step4_skipped');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- 5) Show resulting structure for verification
SHOW INDEX FROM ai_reasoning;
SELECT COUNT(*) AS reasoning_rows FROM ai_reasoning;
