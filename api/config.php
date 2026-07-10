<?php
/**
 * TransAI Database Configuration
 * Reads credentials from .env file or uses defaults
 */

// Suppress all errors to prevent corrupting JSON output
error_reporting(E_ALL);
ini_set('display_errors', '0');
if (!ob_get_level()) ob_start();

// CORS headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database configuration defaults
$dbConfig = array(
    'host'     => 'localhost',
    'database' => 'trans_ai_bd',
    'user'     => 'root',
    'password' => '',
    'charset'  => 'utf8mb4'
);

// Try to load from .env file
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            switch ($key) {
                case 'DB_HOST':     $dbConfig['host'] = $value; break;
                case 'DB_DATABASE': $dbConfig['database'] = $value; break;
                case 'DB_USER':     $dbConfig['user'] = $value; break;
                case 'DB_PASSWORD': $dbConfig['password'] = $value; break;
                case 'DB_CHARSET':  $dbConfig['charset'] = $value; break;
            }
        }
    }
}

// PDO connection
function getDbConnection() {
    global $dbConfig;
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['database']};charset={$dbConfig['charset']}";
    try {
        $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['password'], array(
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ));
        return $pdo;
    } catch (PDOException $e) {
        c_jsonResponse(array('ok' => false, 'error' => 'Database connection failed: ' . $e->getMessage()), 500);
        exit;
    }
}

function c_jsonResponse($data, $statusCode) {
    while (ob_get_level()) ob_end_clean();
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function errorResponse($message, $statusCode) {
    c_jsonResponse(array('ok' => false, 'error' => $message), $statusCode);
}

function successResponse($data) {
    c_jsonResponse(array_merge(array('ok' => true), $data), 200);
}
