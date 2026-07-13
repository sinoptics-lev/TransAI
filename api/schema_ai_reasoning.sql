-- ============================================================
-- AI Reasoning Analysis Table
-- Stores DeepSeek AI justification analysis per project
-- ============================================================

USE trans_ai_bd;

CREATE TABLE IF NOT EXISTS ai_reasoning (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL COMMENT 'Local projects.id',
  rm_id       INT DEFAULT 0 COMMENT 'Original RM issue id',
  verdict     VARCHAR(100) NOT NULL DEFAULT 'Нет данных' COMMENT 'Assessment verdict: рекомендован/не рекомендован/Нет данных',
  reasoning   TEXT NOT NULL COMMENT 'Detailed justification text',
  model       VARCHAR(50) DEFAULT 'xlsx-import',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_project (project_id),
  INDEX idx_rm_id (rm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
