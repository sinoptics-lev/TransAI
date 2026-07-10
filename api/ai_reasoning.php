<?php
/**
 * TransAI AI Reasoning API
 * GET:  ?projectId=123 — get reasoning for project
 * POST: { projectId, rmId, verdict, reasoning } — save/update reasoning
 */

error_reporting(0);
ini_set('display_errors', '0');
if (!ob_get_level()) ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

// ============================================================
// GET — retrieve reasoning for a project
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $projectId = isset($_GET['projectId']) ? (int)$_GET['projectId'] : 0;
    $rmId = isset($_GET['rmId']) ? (int)$_GET['rmId'] : 0;

    if ($projectId <= 0 && $rmId <= 0) {
        errorResponse('projectId or rmId is required', 400);
    }

    $pdo = getDbConnection();
    try {
        if ($projectId > 0) {
            $stmt = $pdo->prepare("SELECT project_id AS projectId, rm_id AS rmId, verdict, reasoning, created_at AS createdAt, updated_at AS updatedAt FROM ai_reasoning WHERE project_id = :pid");
            $stmt->execute([':pid' => $projectId]);
        } else {
            $stmt = $pdo->prepare("SELECT project_id AS projectId, rm_id AS rmId, verdict, reasoning, created_at AS createdAt, updated_at AS updatedAt FROM ai_reasoning WHERE rm_id = :rmid");
            $stmt->execute([':rmid' => $rmId]);
        }

        $row = $stmt->fetch();

        if ($row) {
            successResponse([
                'found'     => true,
                'projectId' => (int)$row['projectId'],
                'rmId'      => (int)$row['rmId'],
                'verdict'   => $row['verdict'],
                'reasoning' => $row['reasoning'],
                'createdAt' => $row['createdAt'],
                'updatedAt' => $row['updatedAt'],
            ]);
        } else {
            successResponse(['found' => false, 'reasoning' => null]);
        }
    } catch (Exception $e) {
        errorResponse('Failed to fetch reasoning: ' . $e->getMessage(), 500);
    }
    exit;
}

// ============================================================
// POST — save or update reasoning
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !is_array($input)) {
        errorResponse('Invalid JSON payload');
    }

    $projectId = isset($input['projectId']) ? (int)$input['projectId'] : 0;
    $rmId      = isset($input['rmId']) ? (int)$input['rmId'] : 0;
    $verdict   = isset($input['verdict']) ? trim($input['verdict']) : '';
    $reasoning = isset($input['reasoning']) ? trim($input['reasoning']) : '';

    if ($projectId <= 0) {
        errorResponse('projectId is required');
    }
    if (empty($verdict)) {
        errorResponse('verdict is required');
    }
    if (empty($reasoning)) {
        errorResponse('reasoning is required');
    }

    $pdo = getDbConnection();
    try {
        // Upsert: INSERT ... ON DUPLICATE KEY UPDATE in ai_reasoning
        $stmt = $pdo->prepare("
            INSERT INTO ai_reasoning (project_id, rm_id, verdict, reasoning)
            VALUES (:pid, :rmid, :verdict, :reasoning)
            ON DUPLICATE KEY UPDATE
                rm_id = VALUES(rm_id),
                verdict = VALUES(verdict),
                reasoning = VALUES(reasoning),
                updated_at = NOW()
        ");
        $stmt->execute([
            ':pid'       => $projectId,
            ':rmid'      => $rmId,
            ':verdict'   => $verdict,
            ':reasoning' => $reasoning,
        ]);

        // Also update projects.ai_verdict
        $stmt2 = $pdo->prepare("
            UPDATE projects SET ai_verdict = :verdict, ai_reasoning = :reasoning WHERE id = :pid AND is_deleted = 0
        ");
        $stmt2->execute([
            ':pid'       => $projectId,
            ':verdict'   => $verdict,
            ':reasoning' => $reasoning,
        ]);

        $isUpdate = $stmt->rowCount() === 2; // 1=insert, 2=update

        successResponse([
            'saved'     => true,
            'projectId' => $projectId,
            'verdict'   => $verdict,
            'isUpdate'  => $isUpdate,
            'message'   => $isUpdate ? 'Analysis updated' : 'Analysis saved',
        ]);
    } catch (Exception $e) {
        errorResponse('Failed to save reasoning: ' . $e->getMessage(), 500);
    }
    exit;
}

errorResponse('Only GET and POST are allowed', 405);
