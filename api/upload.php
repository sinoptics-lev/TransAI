<?php
/**
 * TransAI Upload API — Upsert mode by rm_id
 */
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Only POST method is allowed', 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !is_array($input)) {
    errorResponse('Invalid JSON payload');
}

$projects = isset($input['projects']) ? $input['projects'] : array();
$meta     = isset($input['meta']) ? $input['meta'] : array();

// Debug: check first project keys
if (!empty($projects[0])) {
    $first = $projects[0];
    error_log('[upload.php] Keys: ' . implode(', ', array_keys($first)));
    error_log('[upload.php] createdDate=' . (isset($first['createdDate']) ? $first['createdDate'] : 'MISSING'));
    error_log('[upload.php] updatedDate=' . (isset($first['updatedDate']) ? $first['updatedDate'] : 'MISSING'));
}

if (empty($projects) || !is_array($projects)) {
    errorResponse('No projects data provided');
}

$firstProject = $projects[0];
$requiredFields = array('name', 'department');
foreach ($requiredFields as $field) {
    if (!isset($firstProject[$field])) {
        errorResponse("Missing required field in project data: {$field}");
    }
}

$pdo = getDbConnection();

try {
    $pdo->beginTransaction();

    // Step 1: Load all existing projects from DB
    $existingStmt = $pdo->query("SELECT id, rm_id, is_deleted FROM projects");
    $existingRows = $existingStmt->fetchAll();

    $dbByRmId = array();
    $dbRmIds  = array();
    foreach ($existingRows as $row) {
        $rid = (int)$row['rm_id'];
        $dbByRmId[$rid] = array('id' => (int)$row['id'], 'is_deleted' => (int)$row['is_deleted']);
        $dbRmIds[] = $rid;
    }

    // Step 2: Build map of uploaded rm_ids
    $uploadedRmIds = array();
    $projectByRmId = array();
    foreach ($projects as $p) {
        $rmId = 0;
        if (!empty($p['link']) && is_string($p['link'])) {
            if (preg_match('/\/issues\/(\d+)/', $p['link'], $m)) {
                $rmId = (int)$m[1];
            }
        }
        if ($rmId > 0) {
            $uploadedRmIds[] = $rmId;
            $projectByRmId[$rmId] = $p;
        }
    }
    $uploadedRmIdsSet = array_flip($uploadedRmIds);

    // Step 3: Pre-compute verdicts
    $verdictMap = array();
    if (!empty($input['aiData']) && is_array($input['aiData'])) {
        foreach ($input['aiData'] as $rmIdStr => $analysis) {
            if (is_array($analysis)) {
                $verdictMap[(int)$rmIdStr] = extractVerdictFromAI($analysis);
            }
        }
    }

    // Step 4: Mark DB projects NOT in upload as deleted
    $toDelete = array();
    foreach ($dbRmIds as $rid) {
        if (!isset($uploadedRmIdsSet[$rid])) {
            $toDelete[] = $rid;
        }
    }
    if (!empty($toDelete)) {
        $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
        $delStmt = $pdo->prepare("UPDATE projects SET is_deleted = 1, deleted_at = NOW() WHERE rm_id IN ($placeholders)");
        $delStmt->execute($toDelete);
    }

    // Step 5: Upsert projects
    $inserted = 0; $updated = 0; $restored = 0;

    $updStmt = $pdo->prepare("
        UPDATE projects SET
            name = :name, topic = :topic, department = :department,
            link = :link, start_date = :start_date, end_date = :end_date,
            effects = :effects, effect_type = :effect_type, effect_amount = :effect_amount,
            labor_release = :labor_release, reduction_plan = :reduction_plan, mingos = :mingos,
            cost_fot = :cost_fot, cost_direct = :cost_direct, cost_infra = :cost_infra, cost_total = :cost_total,
            economic_effect = :economic_effect, delta = :delta, non_material_effect = :non_material_effect,
            rm_status = :rm_status, db_status = :db_status, db_leader = :db_leader, db_responsible = :db_responsible,
            labor_claimed = :labor_claimed, reduction_actual = :reduction_actual, release_other = :release_other,
            reduction_date = :reduction_date,
            created_date = :created_date, updated_date = :updated_date,
            ai_verdict = CASE WHEN :has_ai_v = 1 THEN :ai_verdict ELSE ai_verdict END,
            ai_reasoning = CASE WHEN :has_ai_r = 1 THEN :ai_reasoning ELSE ai_reasoning END,
            is_deleted = 0, deleted_at = NULL
        WHERE rm_id = :rm_id
    ");

    $insStmt = $pdo->prepare("
        INSERT INTO projects (
            rm_id, link, name, topic, department,
            start_date, end_date, effects, effect_type, effect_amount,
            labor_release, reduction_plan, mingos,
            cost_fot, cost_direct, cost_infra, cost_total,
            economic_effect, delta, non_material_effect,
            rm_status, db_status, db_leader, db_responsible,
            labor_claimed, reduction_actual, release_other, reduction_date,
            created_date, updated_date,
            ai_verdict, ai_reasoning
        ) VALUES (
            :rm_id, :link, :name, :topic, :department,
            :start_date, :end_date, :effects, :effect_type, :effect_amount,
            :labor_release, :reduction_plan, :mingos,
            :cost_fot, :cost_direct, :cost_infra, :cost_total,
            :economic_effect, :delta, :non_material_effect,
            :rm_status, :db_status, :db_leader, :db_responsible,
            :labor_claimed, :reduction_actual, :release_other, :reduction_date,
            :created_date, :updated_date,
            :ai_verdict, :ai_reasoning
        )
    ");

    foreach ($projectByRmId as $rmId => $project) {
        $aiVerdict = 'Нет данных';
        $aiReasoning = 'Данные ИИ-анализа отсутствуют';
        if (isset($verdictMap[$rmId]) && $verdictMap[$rmId] !== 'Нет данных') {
            $aiVerdict = $verdictMap[$rmId];
            $aiCols = $input['aiData'][(string)$rmId] ?? array();
            $lines = array();
            foreach ($aiCols as $colName => $colValue) {
                $lines[] = $colName . ': ' . $colValue;
            }
            $aiReasoning = implode("\n", $lines);
        }

        $params = array(
            ':rm_id'            => $rmId,
            ':link'             => isset($project['link']) ? $project['link'] : '',
            ':name'             => isset($project['name']) ? $project['name'] : '',
            ':topic'            => isset($project['topic']) ? $project['topic'] : '',
            ':department'       => isset($project['department']) ? $project['department'] : '',
            ':start_date'       => isset($project['startDate']) ? $project['startDate'] : '',
            ':end_date'         => isset($project['endDate']) ? $project['endDate'] : '',
            ':effects'          => isset($project['effects']) ? $project['effects'] : '',
            ':effect_type'      => isset($project['effectType']) ? $project['effectType'] : '',
            ':effect_amount'    => isset($project['effectAmount']) ? $project['effectAmount'] : 0,
            ':labor_release'    => isset($project['laborRelease']) ? $project['laborRelease'] : 0,
            ':reduction_plan'   => isset($project['reductionPlan']) ? $project['reductionPlan'] : 0,
            ':mingos'           => isset($project['mingos']) ? $project['mingos'] : 'Нет',
            ':cost_fot'         => isset($project['costFOT']) ? $project['costFOT'] : 0,
            ':cost_direct'      => isset($project['costDirect']) ? $project['costDirect'] : 0,
            ':cost_infra'       => isset($project['costInfra']) ? $project['costInfra'] : 0,
            ':cost_total'       => isset($project['costTotal']) ? $project['costTotal'] : 0,
            ':economic_effect'  => isset($project['economicEffect']) ? $project['economicEffect'] : 0,
            ':delta'            => isset($project['delta']) ? $project['delta'] : 0,
            ':non_material_effect' => isset($project['nonMaterialEffect']) ? $project['nonMaterialEffect'] : '',
            ':rm_status'        => isset($project['rmStatus']) ? $project['rmStatus'] : '',
            ':db_status'        => isset($project['dbStatus']) ? $project['dbStatus'] : '',
            ':db_leader'        => isset($project['dbLeader']) ? $project['dbLeader'] : '',
            ':db_responsible'   => isset($project['dbResponsible']) ? $project['dbResponsible'] : '',
            ':labor_claimed'    => isset($project['laborClaimed']) ? $project['laborClaimed'] : 0,
            ':reduction_actual' => isset($project['reductionActual']) ? $project['reductionActual'] : 0,
            ':release_other'    => isset($project['releaseOther']) ? $project['releaseOther'] : 0,
            ':reduction_date'   => isset($project['reductionDate']) ? $project['reductionDate'] : '',
            ':created_date'     => isset($project['createdDate']) ? $project['createdDate'] : '',
            ':updated_date'     => isset($project['updatedDate']) ? $project['updatedDate'] : '',
            ':ai_verdict'       => $aiVerdict,
            ':ai_reasoning'     => $aiReasoning,
            ':has_ai_v'         => ($aiVerdict !== 'Нет данных') ? 1 : 0,
            ':has_ai_r'         => ($aiVerdict !== 'Нет данных') ? 1 : 0,
        );

        if (isset($dbByRmId[$rmId])) {
            $updStmt->execute($params);
            if ($dbByRmId[$rmId]['is_deleted'] === 1) {
                $restored++;
            } else {
                $updated++;
            }
        } else {
            // INSERT has no :has_ai_* placeholders — strip them (native prepares reject extras)
            $insParams = $params;
            unset($insParams[':has_ai_v'], $insParams[':has_ai_r']);
            $insStmt->execute($insParams);
            $inserted++;
        }
    }

    // Step 6: Upsert AI analysis
    if (!empty($input['aiData']) && is_array($input['aiData'])) {
        $aiStmt = $pdo->prepare("
            INSERT INTO ai_analysis (rm_id, col_name, col_value)
            VALUES (:rm_id, :col_name, :col_value)
            ON DUPLICATE KEY UPDATE
                col_value = VALUES(col_value),
                is_deleted = 0,
                deleted_at = NULL,
                updated_at = NOW()
        ");

        foreach ($input['aiData'] as $rmIdStr => $analysis) {
            if (!is_array($analysis)) continue;
            $rmId = (int)$rmIdStr;
            foreach ($analysis as $colName => $colValue) {
                $aiStmt->execute(array(
                    ':rm_id'      => $rmId,
                    ':col_name'   => $colName,
                    ':col_value'  => is_string($colValue) ? $colValue : json_encode($colValue),
                ));
            }
        }

        if (!empty($toDelete)) {
            $delAiPlaceholders = implode(',', array_fill(0, count($toDelete), '?'));
            $delAiStmt = $pdo->prepare("UPDATE ai_analysis SET is_deleted = 1, deleted_at = NOW() WHERE rm_id IN ($delAiPlaceholders)");
            $delAiStmt->execute($toDelete);
        }
    }

    $pdo->commit();

    $recommended = 0; $notRecommended = 0; $noData = 0;
    foreach ($uploadedRmIds as $rmId) {
        if (isset($verdictMap[$rmId])) {
            $v = $verdictMap[$rmId];
            if ($v === 'рекомендован к внедрению' || $v === 'однозначно рекомендуется' || $v === 'рекомендуется с учетом социальной направленности' || $v === 'рекомендуется с учетом внесения изменений') {
                $recommended++;
            } else {
                $notRecommended++;
            }
        } else {
            $noData++;
        }
    }

    successResponse(array(
        'inserted'       => $inserted,
        'updated'        => $updated,
        'restored'       => $restored,
        'deleted'        => count($toDelete),
        'totalProcessed' => count($uploadedRmIds),
        'verdictStats'   => array('recommended' => $recommended, 'notRecommended' => $notRecommended, 'noData' => $noData),
        'message'        => "Обработано " . count($uploadedRmIds) . " проектов: {$inserted} новых, {$updated} обновлено, {$restored} восстановлено, " . count($toDelete) . " удалено.",
    ));

} catch (Exception $e) {
    $pdo->rollBack();
    errorResponse('Upload failed: ' . $e->getMessage(), 500);
}

function extractVerdictFromAI($analysis) {
    $positivePatterns = array('однозначно рекомендуется','рекомендован к внедрению','рекомендуется к внедрению','рекомендуется','рекомендован','целесообразно','эффективен','положительная дельта','окупаемость');
    $negativePatterns = array('не рекомендован к внедрению','не рекомендуется','не рекомендован','нецелесообразно','неэффективен','отрицательная дельта','не окупается');
    foreach ($analysis as $value) {
        $val = mb_strtolower((string)$value);
        foreach ($negativePatterns as $pattern) { if (mb_stripos($val, $pattern) !== false) return 'не рекомендован к внедрению'; }
        foreach ($positivePatterns as $pattern) { if (mb_stripos($val, $pattern) !== false) return 'рекомендован к внедрению'; }
    }
    return 'Нет данных';
}
