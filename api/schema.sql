-- ============================================================
-- TransAI Database Schema
-- Database: trans_ai_bd
-- ============================================================

CREATE DATABASE IF NOT EXISTS trans_ai_bd
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE trans_ai_bd;

-- ------------------------------------------------------------
-- Upload batches (versions of data uploads)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS upload_batches (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  uploaded_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  rm_filename   VARCHAR(255) DEFAULT '',
  db_filename   VARCHAR(255) DEFAULT '',
  ai_filename   VARCHAR(255) DEFAULT '',
  total_records INT DEFAULT 0,
  notes         TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Projects (soft-delete via is_deleted flag)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  batch_id         INT NOT NULL,
  rm_id            INT DEFAULT 0 COMMENT 'Original ID from RM',
  link             VARCHAR(500) DEFAULT '',
  name             VARCHAR(500) NOT NULL,
  topic            VARCHAR(500) DEFAULT '',
  department       VARCHAR(200) DEFAULT '',
  start_date       VARCHAR(50) DEFAULT '',
  end_date         VARCHAR(50) DEFAULT '',
  effects          TEXT,
  effect_type      VARCHAR(200) DEFAULT '',
  effect_amount    DECIMAL(12,2) DEFAULT 0,
  labor_release    DECIMAL(12,2) DEFAULT 0,
  reduction_plan   DECIMAL(12,2) DEFAULT 0,
  mingos           VARCHAR(10) DEFAULT 'Нет',
  cost_fot         DECIMAL(15,2) DEFAULT 0,
  cost_direct      DECIMAL(15,2) DEFAULT 0,
  cost_infra       DECIMAL(15,2) DEFAULT 0,
  cost_total       DECIMAL(15,2) DEFAULT 0,
  economic_effect  DECIMAL(15,2) DEFAULT 0,
  delta            DECIMAL(15,2) DEFAULT 0,
  non_material_effect TEXT,
  rm_status        VARCHAR(200) DEFAULT '',
  db_status        VARCHAR(200) DEFAULT '',
  db_leader        VARCHAR(300) DEFAULT '',
  db_responsible   VARCHAR(300) DEFAULT '',
  labor_claimed    DECIMAL(12,2) DEFAULT 0,
  reduction_actual DECIMAL(12,2) DEFAULT 0,
  release_other    DECIMAL(12,2) DEFAULT 0,
  reduction_date   VARCHAR(50) DEFAULT '',
  ai_verdict       VARCHAR(100) DEFAULT 'Нет данных' COMMENT 'рекомендован/не рекомендован/Нет данных',
  ai_reasoning     TEXT COMMENT 'AI analysis reasoning text',
  is_deleted       TINYINT(1) DEFAULT 0,
  deleted_at       DATETIME NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_batch (batch_id),
  INDEX idx_rm_id (rm_id),
  INDEX idx_department (department),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_active (is_deleted, batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- AI Analysis (key-value pairs per project)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_analysis (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  batch_id    INT NOT NULL,
  project_id  INT NOT NULL COMMENT 'Local project id (auto-increment)',
  rm_id       INT DEFAULT 0 COMMENT 'Original RM issue id',
  col_name    VARCHAR(200) NOT NULL,
  col_value   TEXT,
  is_deleted  TINYINT(1) DEFAULT 0,
  deleted_at  DATETIME NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_batch (batch_id),
  INDEX idx_project (project_id),
  INDEX idx_rm_id (rm_id),
  INDEX idx_active (is_deleted, project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
