-- ============================================================
-- HOTFIX v2.6.6 — repair ai_reasoning table (run once in phpMyAdmin)
--
-- Symptom: DeepSeek analysis "saves" (ok:true) but the row never
-- appears; GET returns found:false. Cause: legacy UNIQUE index
-- uk_project on project_id (NOT NULL, no default) intercepts the
-- upsert and overwrites an unrelated row with project_id=0.
--
-- v2.6.6 ai_reasoning.php applies these fixes automatically on
-- every save, so running this file is optional — but recommended
-- to stop ongoing row corruption immediately.
-- ============================================================

USE trans_ai_bd;

-- 1) Remove duplicate rows per rm_id (keep the newest)
DELETE t1 FROM ai_reasoning t1
INNER JOIN ai_reasoning t2 ON t1.rm_id = t2.rm_id AND t1.id < t2.id;

-- 2) Drop the wrong unique key (ignore error if already dropped)
ALTER TABLE ai_reasoning DROP INDEX uk_project;

-- 3) Make project_id nullable
ALTER TABLE ai_reasoning MODIFY project_id INT NULL DEFAULT NULL;

-- 4) Ensure the correct unique key exists (ignore error if present)
ALTER TABLE ai_reasoning ADD UNIQUE KEY uq_rm_id (rm_id);

-- 5) Verify: expect only PRIMARY, uq_rm_id, idx_rm_id
SHOW INDEX FROM ai_reasoning;
