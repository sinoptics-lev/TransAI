<?php
/**
 * TransAI Projects API
 * Returns all active (non-deleted) projects + AI analysis from the database.
 */
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    errorResponse('Only GET method is allowed', 405);
}

$pdo = getDbConnection();

try {
    // 1. Get active projects
    $stmt = $pdo->query("
        SELECT
            id,
            rm_id AS rmId,
            link,
            name,
            topic,
            department,
            start_date AS startDate,
            end_date AS endDate,
            effects,
            effect_type AS effectType,
            effect_amount AS effectAmount,
            labor_release AS laborRelease,
            reduction_plan AS reductionPlan,
            mingos,
            cost_fot AS costFOT,
            cost_direct AS costDirect,
            cost_infra AS costInfra,
            cost_total AS costTotal,
            economic_effect AS economicEffect,
            delta,
            non_material_effect AS nonMaterialEffect,
            rm_status AS rmStatus,
            db_status AS dbStatus,
            db_leader AS dbLeader,
            db_responsible AS dbResponsible,
            labor_claimed AS laborClaimed,
            reduction_actual AS reductionActual,
            release_other AS releaseOther,
            reduction_date AS reductionDate,
            ai_verdict AS aiVerdict,
            ai_reasoning AS aiReasoning,
            created_at AS createdAt
        FROM projects
        WHERE is_deleted = 0
        ORDER BY id ASC
    ");
    $projects = $stmt->fetchAll();

    // 2. Get AI analysis for active projects
    $aiData = array();
    if (!empty($projects)) {
        $projectIds = array_map(function($p) { return (int)$p['id']; }, $projects);
        $placeholders = implode(',', array_fill(0, count($projectIds), '?'));
        
        $aiStmt = $pdo->prepare("
            SELECT project_id, rm_id, col_name, col_value
            FROM ai_analysis
            WHERE is_deleted = 0 AND project_id IN ($placeholders)
        ");
        $aiStmt->execute($projectIds);
        $aiRows = $aiStmt->fetchAll();

        // Group by rm_id: { "123": { "Колонка": "Значение" } }
        foreach ($aiRows as $row) {
            $rmId = (string)$row['rm_id'];
            $colName = $row['col_name'];
            $colValue = $row['col_value'];
            if (!isset($aiData[$rmId])) {
                $aiData[$rmId] = array();
            }
            $aiData[$rmId][$colName] = $colValue;
        }
    }

    // 3. Attach AI analysis to each project
    foreach ($projects as &$project) {
        $rmIdStr = (string)$project['rmId'];
        if (isset($aiData[$rmIdStr]) && !empty($aiData[$rmIdStr])) {
            $project['aiAnalysis'] = $aiData[$rmIdStr];
        }
    }
    unset($project);

    // 4. Get latest batch info
    $batchStmt = $pdo->query("
        SELECT
            id,
            uploaded_at AS uploadedAt,
            rm_filename AS rmFilename,
            db_filename AS dbFilename,
            ai_filename AS aiFilename,
            total_records AS totalRecords
        FROM upload_batches
        ORDER BY id DESC
        LIMIT 1
    ");
    $latestBatch = $batchStmt->fetch();

    successResponse(array(
        'projects'    => $projects,
        'aiData'      => $aiData,
        'count'       => count($projects),
        'latestBatch' => $latestBatch ? $latestBatch : null,
    ));

} catch (Exception $e) {
    errorResponse('Failed to fetch projects: ' . $e->getMessage(), 500);
}
