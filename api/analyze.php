<?php
/**
 * TransAI AI Analysis API
 * Calls DeepSeek to analyze project justification.
 */

// Log errors to file instead of output
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../php_errors.log');
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Clear output buffer
while (ob_get_level()) ob_end_clean();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

function a_send($data) {
    while (ob_get_level()) ob_end_clean();
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function a_log($msg) {
    error_log('[analyze.php] ' . $msg);
}

a_log('=== START ===');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    a_log('ERROR: not POST, method=' . $_SERVER['REQUEST_METHOD']);
    a_send(['analysis' => 'Метод не поддерживается. Используйте POST.']);
}

// Step 1: Read API key from .env
$apiKey = '';
$envFile = __DIR__ . '/../.env';
a_log('Looking for .env at: ' . $envFile);

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines) {
        foreach ($lines as $line) {
            $line = trim($line);
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, 'DEEPSEEK_API_KEY=') === 0) {
                $apiKey = trim(substr($line, strlen('DEEPSEEK_API_KEY=')));
                break;
            }
        }
    }
}

if (empty($apiKey)) {
    a_log('ERROR: DEEPSEEK_API_KEY not found in .env');
    a_send(['analysis' => 'AI-анализ недоступен: не настроен DEEPSEEK_API_KEY. Добавьте ключ в файл .env']);
}

a_log('API key found, length=' . strlen($apiKey));

// Step 2: Read input JSON
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    a_log('ERROR: failed to decode JSON input');
    a_send(['analysis' => 'Ошибка: не удалось прочитать данные запроса.']);
}

a_log('Input keys: ' . implode(', ', array_keys($input)));

// Step 3: Build prompt
$prompt = buildPrompt($input);
a_log('Prompt built, length=' . strlen($prompt));

// Step 4: Prepare payload
$payload = [
    'model' => 'deepseek-chat',
    'messages' => [
        [
            'role' => 'system',
            'content' => 'Ты руководитель цифровой трансформации в регионе. Оцениваешь обоснованность проектов цифровой трансформации. Отвечаешь кратко, по делу, без лишних слов. Используешь конкретные цифры из данных проекта. Учитываешь социальную направленность проектов. При оценке проектов учитываешь социальную направленность некоторых объектов. Отвечаешь на русском языке.'
        ],
        [
            'role' => 'user',
            'content' => $prompt
        ]
    ],
    'max_tokens' => 2000,
    'temperature' => 0.3
];

a_log('Sending request to DeepSeek API...');

// Step 5: Call DeepSeek API
$ch = curl_init('https://api.deepseek.com/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $apiKey
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    a_log('ERROR: curl error: ' . $curlError);
    a_send(['analysis' => 'Ошибка соединения с Deepseek: ' . $curlError]);
}

a_log('DeepSeek HTTP code: ' . $httpCode);
a_log('DeepSeek response length: ' . strlen($response));

if ($httpCode !== 200) {
    a_log('ERROR: DeepSeek returned HTTP ' . $httpCode . ', response: ' . substr($response, 0, 500));
    a_send(['analysis' => 'Ошибка Deepseek API (HTTP ' . $httpCode . '). Проверьте API-ключ.']);
}

// Step 6: Parse response
$data = json_decode($response, true);
if (!$data) {
    a_log('ERROR: failed to parse DeepSeek JSON response');
    a_send(['analysis' => 'Не удалось распарсить ответ от DeepSeek.']);
}

$content = $data['choices'][0]['message']['content'] ?? null;

if ($content) {
    a_log('SUCCESS: analysis received, length=' . strlen($content));
    a_send(['analysis' => $content]);
} else {
    a_log('ERROR: no content in response. Keys: ' . implode(', ', array_keys($data)));
    a_send(['analysis' => 'Не удалось получить анализ от AI. Ответ: ' . json_encode($data, JSON_UNESCAPED_UNICODE)]);
}

// ============================================================
function buildPrompt($data) {
    $sections = [];
    $sections[] = 'Ты руководитель цифровой трансформации в регионе.';
    $sections[] = 'Проанализируй обоснованность реализации следующего проекта цифровой трансформации:';
    $sections[] = '';
    $sections[] = '## Основные данные проекта';
    $sections[] = '- **Название:** ' . ($data['projectName'] ?? '');
    $sections[] = '- **Ведомство:** ' . ($data['department'] ?? '');
    $sections[] = '- **Тема:** ' . ($data['topic'] ?? '');
    $sections[] = '';

    $sections[] = '## Эффекты проекта';
    $sections[] = '- **Описание эффектов:** ' . ($data['effects'] ?? '');
    $sections[] = '- **Тип эффекта:** ' . ($data['effectType'] ?? '');
    $sections[] = '- **Сумма эффекта:** ' . ($data['effectAmount'] ?? 0) . ' млн руб.';
    $sections[] = '';

    $sections[] = '## Финансовые показатели';
    $sections[] = '- **Заявлено к высвобождению:** ' . ($data['laborClaimed'] ?? 0) . ' чел.';
    $sections[] = '- **План сокращения:** ' . ($data['reductionPlan'] ?? 0) . ' чел.';
    $sections[] = '- **Затраты:** ' . number_format(($data['costTotal'] ?? 0) / 1000, 2) . ' млн руб.';
    $sections[] = '- **Экономический эффект:** ' . number_format($data['economicEffect'] ?? 0, 1) . ' млн руб.';
    $sections[] = '- **Дельта (эффективность):** ' . number_format($data['delta'] ?? 0, 1) . ' млн руб.';
    $sections[] = '';

    if (!empty($data['aiAnalysisData']) && is_array($data['aiAnalysisData'])) {
        $sections[] = '## Данные ИИ-анализа';
        foreach ($data['aiAnalysisData'] as $key => $value) {
            $sections[] = '- **' . $key . ':** ' . $value;
        }
        $sections[] = '';
    }

    $sections[] = '## Требуемый анализ';
    $sections[] = '';
    $sections[] = 'Оцени обоснованность реализации проекта и сформируй ответ в следующем виде:';
    $sections[] = 'Заголовок: Оценка проекта';
    $sections[] = 'Текст блока:';
    $sections[] = '- не рекомендуется;';
    $sections[] = '- рекомендуется с учетом социальной направленности;';
    $sections[] = '- рекомендуется с учетом внесения изменений;';
    $sections[] = '- однозначно рекомендуется';
    $sections[] = 'Заголовок: Краткое обоснование оценки.';
    $sections[] = 'Текст блока: Изложить обоснование выбранного решения кратко, по делу без лишних слов. Использовать конкретные цифры';
    $sections[] = '';
    $sections[] = 'Пример:';
    $sections[] = 'Оценка проекта.';
    $sections[] = 'Рекомендуется с учетом внесения изменений.';
    $sections[] = '';
    $sections[] = 'Краткое обоснование оценки.';
    $sections[] = 'Проект обещает 5,1 млрд руб. дополнительных налоговых поступлений при нулевых затратах, что формально крайне эффективно. Однако ИИ-анализ выявил отсутствие детализации мероприятий, налоговой базы и контрфактического сценария. Без разбивки по источникам и мерам существует высокий риск завышения эффекта и повторного учета с другими программами. Проект социально значим (пополнение бюджета), но требует доработки: декомпозировать 5,1 млрд руб. по источникам, срокам и ответственным, подтвердив атрибуцию прироста именно мероприятиям проекта.';
    $sections[] = '';
    $sections[] = 'При оценке проектов учитывать социальную направленность некоторых объектов.';
    $sections[] = 'Ответь на русском языке.';

    return implode("\n", $sections);
}
