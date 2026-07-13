<?php
/**
 * TransAI diagnostic endpoint.
 * Open in browser: /api/ping.php        — PHP check
 *                  /api/ping.php?db=1   — PHP + MySQL connection check
 *                  /api/ping.php?db=2   — + ai_reasoning table structure
 */
error_reporting(E_ALL);
ini_set('display_errors', '1');
while (ob_get_level()) ob_end_clean();
header('Content-Type: application/json; charset=utf-8');

$out = array(
    'ok'       => true,
    'php'      => PHP_VERSION,
    'sapi'     => php_sapi_name(),
    'time'     => date('c'),
    'pdo_mysql'=> extension_loaded('pdo_mysql'),
    'env_file' => file_exists(__DIR__ . '/../.env'),
);

if (isset($_GET['db'])) {
    require_once __DIR__ . '/config.php';
    try {
        $pdo = getDbConnection();
        $out['db'] = 'connected';
        try {
            $out['tables'] = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        } catch (Exception $e) {
            $out['tables_error'] = $e->getMessage();
        }
        // Extended diagnostics: table structure for AI tables
        if ((int)$_GET['db'] >= 2) {
            foreach (array('ai_reasoning', 'ai_analysis', 'projects') as $tbl) {
                try {
                    $out['structure'][$tbl]['columns'] = $pdo->query("SHOW COLUMNS FROM `$tbl`")->fetchAll(PDO::FETCH_ASSOC);
                    $out['structure'][$tbl]['indexes'] = $pdo->query("SHOW INDEX FROM `$tbl`")->fetchAll(PDO::FETCH_ASSOC);
                    $out['structure'][$tbl]['rows'] = (int)$pdo->query("SELECT COUNT(*) FROM `$tbl`")->fetchColumn();
                } catch (Exception $e) {
                    $out['structure'][$tbl]['error'] = $e->getMessage();
                }
            }
        }
    } catch (Exception $e) {
        $out['ok'] = false;
        $out['db'] = 'failed: ' . $e->getMessage();
    }
}

echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
