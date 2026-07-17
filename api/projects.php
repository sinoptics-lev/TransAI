<?php
/**
 * TransAI Projects API
 * Returns all active (non-deleted) projects + AI analysis.
 */
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') { errorResponse('Only GET', 405); }

$pdo = getDbConnection();
try {
    $stmt = $pdo->query("
        SELECT id, rm_id AS rmId, link, name, topic, department,
            start_date AS startDate, end_date AS endDate, effects,
            effect_type AS effectType, effect_amount AS effectAmount,
            labor_release AS laborRelease, reduction_plan AS reductionPlan, mingos,
            cost_fot AS costFOT, cost_direct AS costDirect, cost_infra AS costInfra, cost_total AS costTotal,
            economic_effect AS economicEffect, delta, non_material_effect AS nonMaterialEffect,
            rm_status AS rmStatus, db_status AS dbStatus, db_leader AS dbLeader, db_responsible AS dbResponsible,
            labor_claimed AS laborClaimed, reduction_actual AS reductionActual, release_other AS releaseOther,
            reduction_date AS reductionDate, ai_verdict AS aiVerdict, ai_reasoning AS aiReasoning,
            created_date AS createdDate, updated_date AS updatedDate
        FROM projects WHERE is_deleted = 0 ORDER BY rm_id ASC
    ");
    $projects = $stmt->fetchAll();

    $aiData = array();
    if (!empty($projects)) {
        $rmIds = array_filter(array_unique(array_map(function($p) { return (int)$p['rmId']; }, $projects)));
        if (!empty($rmIds)) {
            $placeholders = implode(',', array_fill(0, count($rmIds), '?'));
            $aiStmt = $pdo->prepare("SELECT rm_id, col_name, col_value FROM ai_analysis WHERE is_deleted = 0 AND rm_id IN ($placeholders)");
            $aiStmt->execute(array_values($rmIds));
            foreach ($aiStmt->fetchAll() as $row) {
                $rmId = (string)$row['rm_id'];
                if (!isset($aiData[$rmId])) $aiData[$rmId] = array();
                $aiData[$rmId][$row['col_name']] = $row['col_value'];
            }
        }
    }

    foreach ($projects as &$project) {
        $rmIdStr = (string)$project['rmId'];
        if (isset($aiData[$rmIdStr]) && !empty($aiData[$rmIdStr])) {
            $project['aiAnalysis'] = $aiData[$rmIdStr];
        }
    }
    unset($project);

    successResponse(array('projects' => $projects, 'aiData' => $aiData, 'count' => count($projects)));
} catch (Exception $e) {
    errorResponse('Failed: ' . $e->getMessage(), 500);
}
