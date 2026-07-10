<?php
/**
 * TransAI XLSX Validation API
 * Validates uploaded XLSX files against expected structure.
 * Compatible with PHP 5.6+
 */

error_reporting(0);
ini_set('display_errors', '0');
if (!ob_get_level()) ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function v_send($data, $code) {
    while (ob_get_level()) ob_end_clean();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function v_err($msg, $code) {
    v_send(array('ok' => false, 'rmValid' => false, 'dbValid' => false, 'rmHeaders' => array(), 'dbHeaders' => array(), 'rmMissing' => array(), 'dbMissing' => array(), 'message' => $msg, 'error' => $msg), $code);
}
function v_ok($data) {
    v_send(array_merge(array('ok' => true), $data), 200);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    v_err('Only POST method is allowed', 405);
}

if (!isset($_FILES['rmFile']) || !isset($_FILES['dbFile'])) {
    v_err('Both rmFile and dbFile are required');
}

$rmFile = $_FILES['rmFile'];
$dbFile = $_FILES['dbFile'];

if ($rmFile['error'] !== UPLOAD_ERR_OK) {
    v_err('RM file upload error code: ' . $rmFile['error']);
}
if ($dbFile['error'] !== UPLOAD_ERR_OK) {
    v_err('DB file upload error code: ' . $dbFile['error']);
}
if ($rmFile['size'] === 0) v_err('RM file is empty');
if ($dbFile['size'] === 0) v_err('DB file is empty');

$rmExt = strtolower(pathinfo($rmFile['name'], PATHINFO_EXTENSION));
$dbExt = strtolower(pathinfo($dbFile['name'], PATHINFO_EXTENSION));
if ($rmExt !== 'xlsx' || $dbExt !== 'xlsx') {
    v_err('Both files must be .xlsx format');
}

if (!class_exists('ZipArchive')) {
    v_err('Server does not support ZipArchive. Cannot read XLSX files.');
}

// Extract headers
$rmHeaders = extractHeaders($rmFile['tmp_name']);
$dbHeaders = extractHeaders($dbFile['tmp_name']);

if (empty($rmHeaders)) {
    v_err('RM file: Could not read headers. File may be corrupted or not a valid XLSX.');
}
if (empty($dbHeaders)) {
    v_err('DB file: Could not read headers. File may be corrupted or not a valid XLSX.');
}

// --- RM required columns ---
$rmRequired = array(
    array('label' => 'ID / #',     'names' => array('#')),
    array('label' => 'Проект',     'names' => array('Проект')),
    array('label' => 'ЦИО',        'names' => array('ЦИО')),
    array('label' => 'Тема',       'names' => array('Тема')),
    array('label' => 'Статус',     'names' => array('Статус')),
    array('label' => 'Срок',       'names' => array('Срок')),
    array('label' => 'Эффекты',    'names' => array('Эффекты')),
    array('label' => 'ФОТ',        'names' => array('ФОТ')),
    array('label' => 'ЦОД',        'names' => array('ЦОД')),
    array('label' => 'Прямые затраты', 'names' => array('Прямые')),
    array('label' => 'Мингос',     'names' => array('Мингос')),
);

// --- DB required columns ---
$dbRequired = array(
    array('label' => '№ / Порядковый номер',  'names' => array('Порядковый', 'номер')),
    array('label' => 'Наименование проекта',    'names' => array('Наименование', 'проекта')),
    array('label' => 'Заявлено к высвобождению', 'names' => array('Заявлено', 'высвобождению')),
    array('label' => 'Факт высвобождения',      'names' => array('Факт высвобождения')),
    array('label' => 'Физ.сокращение план',     'names' => array('сокращение план')),
    array('label' => 'Физ.сокращение факт',     'names' => array('сокращение факт')),
    array('label' => 'Срок реализации',         'names' => array('Срок реализации')),
    array('label' => 'Затраты',                 'names' => array('Затраты')),
    array('label' => 'Статус',                  'names' => array('Статус')),
    array('label' => 'Ответственный',           'names' => array('Ответственный')),
    array('label' => 'Ведомство',               'names' => array('Ведомство')),
    array('label' => 'ID задачи',               'names' => array('ID задачи')),
    array('label' => 'Руководство',             'names' => array('Руководство')),
);

// Validate RM
$rmMissing = array();
foreach ($rmRequired as $req) {
    $found = false;
    foreach ($req['names'] as $name) {
        foreach ($rmHeaders as $header) {
            if (mb_stripos($header, $name) !== false) {
                $found = true;
                break 2;
            }
        }
    }
    if (!$found) $rmMissing[] = $req['label'];
}

// Validate DB
$dbMissing = array();
foreach ($dbRequired as $req) {
    $found = false;
    foreach ($req['names'] as $name) {
        foreach ($dbHeaders as $header) {
            if (mb_stripos($header, $name) !== false) {
                $found = true;
                break 2;
            }
        }
    }
    if (!$found) $dbMissing[] = $req['label'];
}

$rmHeadersFound = array_values(array_filter($rmHeaders, function($h) { return $h !== ''; }));
$dbHeadersFound = array_values(array_filter($dbHeaders, function($h) { return $h !== ''; }));

if (!empty($rmMissing) || !empty($dbMissing)) {
    $errors = array();
    if (!empty($rmMissing)) {
        $errors[] = 'Файл РМ: отсутствуют обязательные колонки: ' . implode(', ', $rmMissing);
    }
    if (!empty($dbMissing)) {
        $errors[] = 'Файл ДБ: отсутствуют обязательные колонки: ' . implode(', ', $dbMissing);
    }
    v_err(implode('; ', $errors), 422);
}

v_ok(array(
    'rmValid'     => true,
    'dbValid'     => true,
    'rmHeaders'   => $rmHeadersFound,
    'dbHeaders'   => $dbHeadersFound,
    'rmMissing'   => $rmMissing,
    'dbMissing'   => $dbMissing,
    'message'     => 'Структура файлов соответствует требованиям.',
));

// ============================================================
// Extract headers from XLSX - supports sharedStrings + inlineStr
// ============================================================
function extractHeaders($filepath) {
    if (!file_exists($filepath)) return array();

    $zip = new ZipArchive();
    if ($zip->open($filepath) !== true) return array();

    // Read shared strings
    $sharedStrings = array();
    if ($zip->locateName('xl/sharedStrings.xml') !== false) {
        $ssXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($ssXml) {
            $ssDom = new DOMDocument();
            @$ssDom->loadXML($ssXml);
            $ssXpath = new DOMXPath($ssDom);
            $ssXpath->registerNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
            $siNodes = $ssXpath->query('//s:sst/s:si');
            foreach ($siNodes as $i => $si) {
                $texts = $ssXpath->query('s:t | .//s:r/s:t', $si);
                $str = '';
                foreach ($texts as $t) $str .= $t->nodeValue;
                $sharedStrings[$i] = $str;
            }
        }
    }

    // Read first sheet
    $sheetName = 'xl/worksheets/sheet1.xml';
    if ($zip->locateName($sheetName) === false) {
        $zip->close();
        return array();
    }

    $sheetXml = $zip->getFromName($sheetName);
    $zip->close();
    if (!$sheetXml) return array();

    $dom = new DOMDocument();
    @$dom->loadXML($sheetXml);
    $xpath = new DOMXPath($dom);
    $xpath->registerNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

    $rowNodes = $xpath->query('//s:sheetData/s:row');
    if ($rowNodes->length === 0) return array();

    $firstRow = $rowNodes->item(0);
    $cellNodes = $xpath->query('s:c', $firstRow);

    $headers = array();
    foreach ($cellNodes as $cell) {
        $cellRef = $cell->getAttribute('r');
        preg_match('/^([A-Z]+)/', $cellRef, $matches);
        $col = isset($matches[1]) ? colToIndex($matches[1]) : 0;

        $type = $cell->getAttribute('t');
        $value = '';

        if ($type === 'inlineStr') {
            // inlineStr: value is in <is><t>...</t></is>
            $isNode = $cell->getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'is')->item(0);
            if ($isNode) {
                $tNodes = $isNode->getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 't');
                foreach ($tNodes as $t) $value .= $t->nodeValue;
            }
        } else {
            // shared string or raw value: in <v>...</v>
            $vNodes = $cell->getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'v');
            if ($vNodes->length > 0) {
                $v = $vNodes->item(0)->nodeValue;
                if ($type === 's') {
                    $idx = (int)$v;
                    $value = isset($sharedStrings[$idx]) ? $sharedStrings[$idx] : '';
                } else {
                    $value = $v;
                }
            }
        }

        $headers[$col] = trim($value);
    }

    if (empty($headers)) return array();

    $maxCol = max(array_keys($headers));
    $result = array();
    for ($i = 0; $i <= $maxCol; $i++) {
        $result[$i] = isset($headers[$i]) ? $headers[$i] : '';
    }
    return $result;
}

function colToIndex($letters) {
    $result = 0;
    $len = strlen($letters);
    for ($i = 0; $i < $len; $i++) {
        $result = $result * 26 + (ord($letters[$i]) - ord('A') + 1);
    }
    return $result - 1;
}
