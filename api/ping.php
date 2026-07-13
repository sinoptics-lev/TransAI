<?php
/**
 * TransAI API Ping - Simple health check
 * Returns JSON to confirm PHP is executing.
 * Access: GET /api/ping.php
 */
ini_set('display_errors', '0');
error_reporting(0);

// Clear all output buffers
while (ob_get_level()) ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

echo json_encode([
    'ok' => true,
    'php' => PHP_VERSION,
    'pdo' => extension_loaded('pdo_mysql') ? 'yes' : 'no',
    'curl' => extension_loaded('curl') ? 'yes' : 'no',
    'zip' => class_exists('ZipArchive') ? 'yes' : 'no',
    'time' => date('Y-m-d H:i:s'),
], JSON_UNESCAPED_UNICODE);
exit;
