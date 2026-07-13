-- ============================================================
-- AI Reasoning Analysis Table
-- Stores DeepSeek AI justification analysis per project
-- Upsert key: rm_id (one reasoning per RM issue)
-- ============================================================

USE trans_ai_bd;

CREATE TABLE IF NOT EXISTS ai_reasoning (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  rm_id       INT NOT NULL DEFAULT 0 COMMENT 'Original RM issue id',
  verdict     VARCHAR(200) NOT NULL COMMENT 'Assessment verdict',
  reasoning   TEXT NOT NULL COMMENT 'Detailed justification text',
  model       VARCHAR(50) DEFAULT 'deepseek-chat',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_rm_id (rm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
