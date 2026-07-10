-- ============================================================
-- TransAI Database Schema v2.6
-- Upsert by rm_id, no batch inflation
-- ============================================================

CREATE DATABASE IF NOT EXISTS trans_ai_bd
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE trans_ai_bd;

-- ------------------------------------------------------------
-- Projects (upsert by rm_id, soft-delete via is_deleted)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  rm_id            INT NOT NULL DEFAULT 0 COMMENT 'Original RM issue id (unique key)',
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
  ai_verdict       VARCHAR(100) DEFAULT 'Нет данных',
  ai_reasoning     TEXT,
  is_deleted       TINYINT(1) DEFAULT 0,
  deleted_at       DATETIME NULL,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_rm_id (rm_id),
  INDEX idx_department (department),
  INDEX idx_is_deleted (is_deleted),
  INDEX idx_active (is_deleted, department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- AI Analysis (key-value pairs, upsert by rm_id+col_name)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_analysis (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  rm_id       INT NOT NULL DEFAULT 0,
  col_name    VARCHAR(200) NOT NULL,
  col_value   TEXT,
  is_deleted  TINYINT(1) DEFAULT 0,
  deleted_at  DATETIME NULL,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_rm_col (rm_id, col_name),
  INDEX idx_rm_id (rm_id),
  INDEX idx_active (is_deleted, rm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- AI Reasoning (DeepSeek results, upsert by rm_id)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_reasoning (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  rm_id       INT NOT NULL DEFAULT 0,
  verdict     VARCHAR(200) NOT NULL,
  reasoning   TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_rm_id (rm_id),
  INDEX idx_rm_id (rm_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Upload batches (log only, no FK to projects)
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
