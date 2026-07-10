<?php
/**
 * TransAI AI Reasoning API — Upsert by rm_id
 * GET:  ?rmId=123
 * POST: { rmId, verdict, reasoning }
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
    if (empty($verdict)) { errorResponse('verdict required'); }
    if (empty($reasoning)) { errorResponse('reasoning required'); }

    $pdo = getDbConnection();
    try {
        $stmt = $pdo->prepare("
            INSERT INTO ai_reasoning (rm_id, verdict, reasoning) VALUES (:rmid, :verdict, :reasoning)
            ON DUPLICATE KEY UPDATE verdict = VALUES(verdict), reasoning = VALUES(reasoning), updated_at = NOW()
        ");
        $stmt->execute([':rmid' => $rmId, ':verdict' => $verdict, ':reasoning' => $reasoning]);

        $stmt2 = $pdo->prepare("UPDATE projects SET ai_verdict = :verdict, ai_reasoning = :reasoning WHERE rm_id = :rmid AND is_deleted = 0");
        $stmt2->execute([':rmid' => $rmId, ':verdict' => $verdict, ':reasoning' => $reasoning]);

        $isUpdate = $stmt->rowCount() === 2;
        successResponse(['saved' => true, 'rmId' => $rmId, 'verdict' => $verdict, 'isUpdate' => $isUpdate, 'message' => $isUpdate ? 'Updated' : 'Saved']);
    } catch (Exception $e) { errorResponse('Failed: ' . $e->getMessage(), 500); }
    exit;
}

errorResponse('Only GET/POST', 405);
