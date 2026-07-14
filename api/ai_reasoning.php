<?php
/**
 * TransAI AI Reasoning API — Upsert by rm_id (self-healing)
 * GET:  ?rmId=123
 * POST: { rmId, verdict, reasoning }
 *
 * v2.6.6: automatically repairs broken ai_reasoning structure
 * (drops legacy uk_project index, makes project_id nullable,
 * ensures uq_rm_id exists) and verifies the row after saving.
 */
error_reporting(0);
ini_set('display_errors', '0');
if (!ob_get_level()) ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/config.php';

/**
 * Repair ai_reasoning table structure if it was created by the
 * old broken schema_ai_reasoning.sql (unique key on project_id
 * instead of rm_id). Idempotent and cheap (metadata queries).
 */
function ensureAiReasoningStructure($pdo) {
    $fixes = array();
    try {
        // 1) Drop legacy unique index uk_project (causes upserts to hit the wrong row)
        $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'ai_reasoning' AND index_name = 'uk_project'");
        if ((int)$stmt->fetchColumn() > 0) {
            $pdo->exec("ALTER TABLE ai_reasoning DROP INDEX uk_project");
            $fixes[] = 'dropped uk_project';
        }
        // 2) Make project_id nullable (old schema: NOT NULL without default)
        $stmt = $pdo->query("SELECT IS_NULLABLE FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ai_reasoning' AND column_name = 'project_id'");
        $nullable = $stmt->fetchColumn();
        if ($nullable === 'NO') {
            $pdo->exec("ALTER TABLE ai_reasoning MODIFY project_id INT NULL DEFAULT NULL");
            $fixes[] = 'project_id nullable';
        }
        // 3) Ensure unique key on rm_id exists
        $stmt = $pdo->query("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'ai_reasoning' AND index_name = 'uq_rm_id'");
        if ((int)$stmt->fetchColumn() === 0) {
            // Remove duplicate rm_id rows first (keep newest)
            $pdo->exec("DELETE t1 FROM ai_reasoning t1 INNER JOIN ai_reasoning t2 ON t1.rm_id = t2.rm_id AND t1.id < t2.id");
            $pdo->exec("ALTER TABLE ai_reasoning ADD UNIQUE KEY uq_rm_id (rm_id)");
            $fixes[] = 'added uq_rm_id';
        }
    } catch (Exception $e) {
        // No DDL permissions or other issue — continue; INSERT will report its own error
        $fixes[] = 'repair failed: ' . $e->getMessage();
    }
    return $fixes;
}

// GET
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $rmId = isset($_GET['rmId']) ? (int)$_GET['rmId'] : 0;
    if ($rmId <= 0) { errorResponse('rmId is required', 400); }
    $pdo = getDbConnection();
    try {
        $stmt = $pdo->prepare("SELECT rm_id AS rmId, verdict, reasoning, created_at AS createdAt, updated_at AS updatedAt FROM ai_reasoning WHERE rm_id = :rmid");
        $stmt->execute([':rmid' => $rmId]);
        $row = $stmt->fetch();
        if ($row) {
            successResponse(['found' => true, 'rmId' => (int)$row['rmId'], 'verdict' => $row['verdict'], 'reasoning' => $row['reasoning'], 'createdAt' => $row['createdAt'], 'updatedAt' => $row['updatedAt']]);
        } else {
            successResponse(['found' => false, 'reasoning' => null]);
        }
    } catch (Exception $e) { errorResponse('Failed: ' . $e->getMessage(), 500); }
    exit;
}

// POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !is_array($input)) { errorResponse('Invalid JSON'); }
    $rmId = isset($input['rmId']) ? (int)$input['rmId'] : 0;
    $verdict = isset($input['verdict']) ? trim($input['verdict']) : '';
    $reasoning = isset($input['reasoning']) ? trim($input['reasoning']) : '';
    if ($rmId <= 0) { errorResponse('rmId required'); }
    if ($verdict === '') { $verdict = 'Не определён'; }
    if (empty($reasoning)) { errorResponse('reasoning required'); }

    $pdo = getDbConnection();
    try {
        // Auto-repair broken table structure before saving
        $repairs = ensureAiReasoningStructure($pdo);

        $stmt = $pdo->prepare("
            INSERT INTO ai_reasoning (rm_id, verdict, reasoning) VALUES (:rmid, :verdict, :reasoning)
            ON DUPLICATE KEY UPDATE verdict = VALUES(verdict), reasoning = VALUES(reasoning), updated_at = NOW()
        ");
        $stmt->execute([':rmid' => $rmId, ':verdict' => $verdict, ':reasoning' => $reasoning]);

        // VERIFY the row actually exists for this rm_id (guards against wrong-index upserts)
        $check = $pdo->prepare("SELECT verdict FROM ai_reasoning WHERE rm_id = :rmid");
        $check->execute([':rmid' => $rmId]);
        $saved = $check->fetch();
        if (!$saved) {
            errorResponse('Save verification failed: row not found after upsert. Table structure may need manual repair (see api/migrate_v2.6.4.sql).', 500);
        }

        // Mirror into projects table (best-effort)
        try {
            $stmt2 = $pdo->prepare("UPDATE projects SET ai_verdict = :verdict, ai_reasoning = :reasoning WHERE rm_id = :rmid AND is_deleted = 0");
            $stmt2->execute([':rmid' => $rmId, ':verdict' => $verdict, ':reasoning' => $reasoning]);
        } catch (Exception $e2) { /* non-critical */ }

        $isUpdate = $stmt->rowCount() === 2;
        $resp = ['saved' => true, 'verified' => true, 'rmId' => $rmId, 'verdict' => $verdict, 'isUpdate' => $isUpdate, 'message' => $isUpdate ? 'Updated' : 'Saved'];
        if (!empty($repairs)) { $resp['repairs'] = $repairs; }
        successResponse($resp);
    } catch (Exception $e) { errorResponse('Failed: ' . $e->getMessage(), 500); }
    exit;
}

errorResponse('Only GET/POST', 405);
