<?php
/**
 * TransAI Upload API
 * Receives parsed project data + AI analysis and stores in DB.
 * Sets ai_verdict based on AI XLSX data or 'Нет данных'.
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

    // Step 1: Soft-delete existing projects
    $pdo->prepare("UPDATE projects SET is_deleted = 1, deleted_at = NOW() WHERE is_deleted = 0")->execute();

    // Step 2: Soft-delete existing AI analysis
    $pdo->prepare("UPDATE ai_analysis SET is_deleted = 1, deleted_at = NOW() WHERE is_deleted = 0")->execute();

    // Step 3: Create new upload batch
    $stmt = $pdo->prepare("
        INSERT INTO upload_batches (rm_filename, db_filename, ai_filename, total_records, notes)
        VALUES (:rm_file, :db_file, :ai_file, :total, :notes)
    ");
    $stmt->execute(array(
        ':rm_file' => isset($meta['rmFilename']) ? $meta['rmFilename'] : '',
        ':db_file' => isset($meta['dbFilename']) ? $meta['dbFilename'] : '',
        ':ai_file' => isset($meta['aiFilename']) ? $meta['aiFilename'] : '',
        ':total'   => count($projects),
        ':notes'   => isset($meta['notes']) ? $meta['notes'] : '',
    ));
    $batchId = (int)$pdo->lastInsertId();

    // Pre-compute verdicts from aiData
    $verdictMap = array();
    if (!empty($input['aiData']) && is_array($input['aiData'])) {
        foreach ($input['aiData'] as $rmIdStr => $analysis) {
            if (is_array($analysis)) {
                $verdictMap[(int)$rmIdStr] = extractVerdictFromAI($analysis);
            }
        }
    }

    // Step 4: Insert projects WITH ai_verdict
    $stmt = $pdo->prepare("
        INSERT INTO projects (
            batch_id, rm_id, link, name, topic, department,
            start_date, end_date, effects, effect_type, effect_amount,
            labor_release, reduction_plan, mingos,
            cost_fot, cost_direct, cost_infra, cost_total,
            economic_effect, delta, non_material_effect,
            rm_status, db_status, db_leader, db_responsible,
            labor_claimed, reduction_actual, release_other, reduction_date,
            ai_verdict, ai_reasoning
        ) VALUES (
            :batch_id, :rm_id, :link, :name, :topic, :department,
            :start_date, :end_date, :effects, :effect_type, :effect_amount,
            :labor_release, :reduction_plan, :mingos,
            :cost_fot, :cost_direct, :cost_infra, :cost_total,
            :economic_effect, :delta, :non_material_effect,
            :rm_status, :db_status, :db_leader, :db_responsible,
            :labor_claimed, :reduction_actual, :release_other, :reduction_date,
            :ai_verdict, :ai_reasoning
        )
    ");

    $aiInserted = 0;
    foreach ($projects as $project) {
        $rmId = 0;
        if (!empty($project['link']) && is_string($project['link'])) {
            if (preg_match('/\/issues\/(\d+)/', $project['link'], $matches)) {
                $rmId = (int)$matches[1];
            }
        }

        // Determine verdict
        $aiVerdict = 'Нет данных';
        $aiReasoning = 'Данные ИИ-анализа отсутствуют';

        if (isset($verdictMap[$rmId]) && $verdictMap[$rmId] !== 'Нет данных') {
            $aiVerdict = $verdictMap[$rmId];
            // Build reasoning from AI columns
            $aiCols = $input['aiData'][(string)$rmId] ?? array();
            $lines = array();
            foreach ($aiCols as $colName => $colValue) {
                $lines[] = $colName . ': ' . $colValue;
            }
            $aiReasoning = implode("\n", $lines);
        }

        $stmt->execute(array(
            ':batch_id'         => $batchId,
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
            ':ai_verdict'       => $aiVerdict,
            ':ai_reasoning'     => $aiReasoning,
        ));
        $aiInserted++;
    }

    // Step 5: Insert AI analysis key-value pairs (optional, for reference)
    if (!empty($input['aiData']) && is_array($input['aiData'])) {
        $aiStmt = $pdo->prepare("
            INSERT INTO ai_analysis (batch_id, project_id, rm_id, col_name, col_value)
            VALUES (:batch_id, :project_id, :rm_id, :col_name, :col_value)
        ");

        // Need to rebuild project_id map
        $stmt2 = $pdo->prepare("SELECT id, rm_id FROM projects WHERE batch_id = :bid AND is_deleted = 0 ORDER BY id ASC");
        $stmt2->execute([':bid' => $batchId]);
        $idMap = array();
        while ($row = $stmt2->fetch()) {
            $idMap[(int)$row['rm_id']] = (int)$row['id'];
        }

        foreach ($input['aiData'] as $rmIdStr => $analysis) {
            if (!is_array($analysis)) continue;
            $rmId = (int)$rmIdStr;
            $projectDbId = isset($idMap[$rmId]) ? $idMap[$rmId] : 0;
            if ($projectDbId === 0) continue;

            foreach ($analysis as $colName => $colValue) {
                $aiStmt->execute(array(
                    ':batch_id'   => $batchId,
                    ':project_id' => $projectDbId,
                    ':rm_id'      => $rmId,
                    ':col_name'   => $colName,
                    ':col_value'  => is_string($colValue) ? $colValue : json_encode($colValue),
                ));
            }
        }
    }

    $pdo->commit();

    // Count verdict stats
    $recommended = 0;
    $notRecommended = 0;
    $noData = 0;
    foreach ($projects as $project) {
        $rmId = 0;
        if (!empty($project['link']) && is_string($project['link'])) {
            if (preg_match('/\/issues\/(\d+)/', $project['link'], $matches)) {
                $rmId = (int)$matches[1];
            }
        }
        if (isset($verdictMap[$rmId])) {
            if ($verdictMap[$rmId] === 'рекомендован к внедрению') $recommended++;
            else $notRecommended++;
        } else {
            $noData++;
        }
    }

    successResponse(array(
        'batchId'         => $batchId,
        'inserted'        => count($projects),
        'previousDeleted' => 0,
        'verdictStats'    => array(
            'recommended'    => $recommended,
            'notRecommended' => $notRecommended,
            'noData'         => $noData,
        ),
        'message'         => "Uploaded " . count($projects) . " projects. Verdicts: {$recommended} recommended, {$notRecommended} not recommended, {$noData} no data."
    ));

} catch (Exception $e) {
    $pdo->rollBack();
    errorResponse('Upload failed: ' . $e->getMessage(), 500);
}

// ============================================================
// Extract verdict from AI analysis values using pattern matching
// ============================================================
function extractVerdictFromAI($analysis) {
    $positivePatterns = array(
        'однозначно рекомендуется',
        'рекомендован к внедрению',
        'рекомендуется к внедрению',
        'рекомендуется',
        'рекомендован',
        'целесообразно',
        'эффективен',
        'положительная дельта',
        'окупаемость',
    );
    $negativePatterns = array(
        'не рекомендован к внедрению',
        'не рекомендуется',
        'не рекомендован',
        'нецелесообразно',
        'неэффективен',
        'отрицательная дельта',
        'не окупается',
    );

    foreach ($analysis as $value) {
        $val = mb_strtolower((string)$value);
        foreach ($negativePatterns as $pattern) {
            if (mb_stripos($val, $pattern) !== false) {
                return 'не рекомендован к внедрению';
            }
        }
        foreach ($positivePatterns as $pattern) {
            if (mb_stripos($val, $pattern) !== false) {
                return 'рекомендован к внедрению';
            }
        }
    }

    return 'Нет данных';
}
