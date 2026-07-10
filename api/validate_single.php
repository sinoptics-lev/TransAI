<?php
/**
 * TransAI Single File Validation API
 * Validates one XLSX file (RM or DB) individually.
 * POST: multipart/form-data with 'file' and 'type' (rm|db|ai)
 */

// Log all errors to file instead of output
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../php_errors.log');
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Clear any output buffering
while (ob_get_level()) ob_end_clean();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function vs_send($data, $code) {
    while (ob_get_level()) ob_end_clean();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function vs_err($msg, $code) {
    vs_send(array('ok' => false, 'valid' => false, 'headers' => array(), 'missing' => array(), 'message' => $msg, 'error' => $msg), $code);
}
function vs_ok($data) {
    vs_send(array_merge(array('ok' => true), $data), 200);
}

// --- Debug logging ---
function vlog($msg) {
    error_log('[validate_single] ' . $msg);
}

vlog('=== START ===');
vlog('REQUEST_METHOD: ' . $_SERVER['REQUEST_METHOD']);
vlog('CONTENT_TYPE: ' . ($_SERVER['CONTENT_TYPE'] ?? 'none'));
vlog('FILES: ' . print_r($_FILES, true));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    vlog('ERROR: not POST');
    vs_err('Only POST method is allowed', 405);
}

if (!isset($_FILES['file'])) {
    vlog('ERROR: no file uploaded');
    vs_err('File is required. Use multipart/form-data with field name "file".');
}

$file = $_FILES['file'];
$fileType = isset($_POST['type']) ? $_POST['type'] : 'rm';

vlog('file[name]=' . $file['name'] . ' error=' . $file['error'] . ' size=' . $file['size'] . ' tmp=' . $file['tmp_name']);

if ($file['error'] !== UPLOAD_ERR_OK) {
    $errMsg = 'File upload error code: ' . $file['error'];
    switch ($file['error']) {
        case UPLOAD_ERR_INI_SIZE: $errMsg = 'Файл слишком большой (upload_max_filesize)'; break;
        case UPLOAD_ERR_FORM_SIZE: $errMsg = 'Файл превышает MAX_FILE_SIZE'; break;
        case UPLOAD_ERR_PARTIAL: $errMsg = 'Файл загружен частично'; break;
        case UPLOAD_ERR_NO_FILE: $errMsg = 'Файл не загружен'; break;
        case UPLOAD_ERR_NO_TMP_DIR: $errMsg = 'Временная папка не найдена'; break;
        case UPLOAD_ERR_CANT_WRITE: $errMsg = 'Ошибка записи файла'; break;
    }
    vlog('ERROR: ' . $errMsg);
    vs_err($errMsg);
}

if ($file['size'] === 0) {
    vlog('ERROR: empty file');
    vs_err('File is empty');
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if ($ext !== 'xlsx') {
    vlog('ERROR: wrong extension: ' . $ext);
    vs_err('File must be .xlsx format');
}

if (!class_exists('ZipArchive')) {
    vlog('ERROR: ZipArchive not available');
    vs_err('Server does not support ZipArchive');
}

if (!file_exists($file['tmp_name'])) {
    vlog('ERROR: tmp file not found: ' . $file['tmp_name']);
    vs_err('Uploaded file not found on server');
}

vlog('Extracting headers...');
$headers = extractHeadersSingle($file['tmp_name']);
vlog('Headers count: ' . count($headers));

if (empty($headers)) {
    vlog('ERROR: could not read headers');
    vs_err('Could not read headers. File may be corrupted or not a valid XLSX.');
}

// Count non-empty headers
$headersFound = array_values(array_filter($headers, function($h) { return $h !== ''; }));
vlog('Non-empty headers: ' . count($headersFound));

if ($fileType === 'rm') {
    $required = array(
        array('label' => '# / ID',       'names' => array('#')),
        array('label' => 'Проект',       'names' => array('Проект')),
        array('label' => 'ЦИО',          'names' => array('ЦИО')),
        array('label' => 'Тема',         'names' => array('Тема')),
        array('label' => 'Статус',       'names' => array('Статус')),
        array('label' => 'Срок',         'names' => array('Срок')),
        array('label' => 'Эффекты',      'names' => array('Эффекты')),
        array('label' => 'ФОТ',          'names' => array('ФОТ')),
        array('label' => 'ЦОД',          'names' => array('ЦОД')),
        array('label' => 'Прямые затраты', 'names' => array('Прямые')),
        array('label' => 'Мингос',       'names' => array('Мингос')),
    );
} elseif ($fileType === 'db') {
    $required = array(
        array('label' => '№ / Порядковый номер',      'names' => array('Порядковый', 'номер')),
        array('label' => 'Наименование проекта',        'names' => array('Наименование', 'проекта')),
        array('label' => 'Заявлено к высвобождению',    'names' => array('Заявлено', 'высвобождению')),
        array('label' => 'Факт высвобождения',          'names' => array('Факт высвобождения')),
        array('label' => 'Физ.сокращение план',         'names' => array('сокращение план')),
        array('label' => 'Физ.сокращение факт',         'names' => array('сокращение факт')),
        array('label' => 'Срок реализации',             'names' => array('Срок реализации')),
        array('label' => 'Затраты',                     'names' => array('Затраты')),
        array('label' => 'Статус',                      'names' => array('Статус')),
        array('label' => 'Ответственный',               'names' => array('Ответственный')),
        array('label' => 'Ведомство',                   'names' => array('Ведомство')),
        array('label' => 'ID задачи',                   'names' => array('ID задачи')),
        array('label' => 'Руководство',                 'names' => array('Руководство')),
    );
} else {
    vs_ok(array('valid' => true, 'headers' => $headersFound, 'missing' => array(), 'message' => 'Файл прочитан. ' . count($headersFound) . ' колонок.', 'type' => $fileType));
    exit;
}

// Validate headers
$missing = array();
foreach ($required as $req) {
    $found = false;
    foreach ($req['names'] as $name) {
        foreach ($headers as $header) {
            if (mb_stripos($header, $name) !== false) {
                $found = true;
                break 2;
            }
        }
    }
    if (!$found) $missing[] = $req['label'];
}

vlog('Missing columns: ' . count($missing));

if (!empty($missing)) {
    vlog('Validation FAILED');
    vs_err('Отсутствуют обязательные колонки: ' . implode(', ', $missing), 422);
}

vlog('Validation PASSED');
vs_ok(array(
    'valid'     => true,
    'headers'   => $headersFound,
    'missing'   => $missing,
    'message'   => 'Структура файла соответствует требованиям.',
    'type'      => $fileType,
));

// ============================================================
function extractHeadersSingle($filepath) {
    if (!file_exists($filepath)) return array();

    $zip = new ZipArchive();
    if ($zip->open($filepath) !== true) return array();

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
        $col = isset($matches[1]) ? colToIdx($matches[1]) : 0;

        $type = $cell->getAttribute('t');
        $value = '';

        if ($type === 'inlineStr') {
            $isNode = $cell->getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'is')->item(0);
            if ($isNode) {
                $tNodes = $isNode->getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 't');
                foreach ($tNodes as $t) $value .= $t->nodeValue;
            }
        } else {
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

function colToIdx($letters) {
    $result = 0;
    $len = strlen($letters);
    for ($i = 0; $i < $len; $i++) {
        $result = $result * 26 + (ord($letters[$i]) - ord('A') + 1);
    }
    return $result - 1;
}
