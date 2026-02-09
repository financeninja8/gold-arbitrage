<?php
/**
 * API 連線測試腳本
 * 用於驗證您的主機是否支援 PHP 對外部 URL 發送請求
 */

header('Content-Type: text/html; charset=utf-8');

echo "<h1>🔧 Gold Price API 連線測試</h1>";
echo "<hr>";

// 測試 1: 檢查 allow_url_fopen
echo "<h2>1. PHP 設定檢查</h2>";
echo "<ul>";
echo "<li>allow_url_fopen: " . (ini_get('allow_url_fopen') ? '✅ 啟用' : '❌ 停用') . "</li>";
echo "<li>cURL 支援: " . (function_exists('curl_init') ? '✅ 啟用' : '❌ 停用') . "</li>";
echo "<li>OpenSSL 支援: " . (extension_loaded('openssl') ? '✅ 啟用' : '❌ 停用') . "</li>";
echo "</ul>";

// 測試 2: 嘗試連線 GoldPrice.org
echo "<h2>2. API 連線測試</h2>";

$testUrls = [
    'GoldPrice.org' => 'https://data-asg.goldprice.org/dbXRates/USD',
    'Metals.dev' => 'https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=oz'
];

foreach ($testUrls as $name => $url) {
    echo "<h3>$name</h3>";
    
    $opts = [
        'http' => [
            'method' => 'GET',
            'timeout' => 10,
            'header' => 'User-Agent: Mozilla/5.0'
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    
    $context = stream_context_create($opts);
    $start = microtime(true);
    $response = @file_get_contents($url, false, $context);
    $elapsed = round((microtime(true) - $start) * 1000);
    
    if ($response !== false) {
        $data = json_decode($response, true);
        echo "<p style='color: green;'>✅ 連線成功 (耗時: {$elapsed}ms)</p>";
        
        // 嘗試解析金價
        if ($name === 'GoldPrice.org' && isset($data['items'][0]['xauPrice'])) {
            $price = $data['items'][0]['xauPrice'];
            echo "<p><strong>當前金價: \$$price USD/oz</strong></p>";
        } elseif ($name === 'Metals.dev' && isset($data['metals']['gold'])) {
            $price = $data['metals']['gold'];
            echo "<p><strong>當前金價: \$$price USD/oz</strong></p>";
        }
    } else {
        echo "<p style='color: red;'>❌ 連線失敗</p>";
        $error = error_get_last();
        if ($error) {
            echo "<p style='color: orange;'>錯誤: " . htmlspecialchars($error['message']) . "</p>";
        }
    }
}

// 測試 3: 測試主 API
echo "<h2>3. 完整 API 測試</h2>";
echo "<p>正在呼叫 gold_prices.php...</p>";

$apiUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") 
        . "://{$_SERVER['HTTP_HOST']}" 
        . dirname($_SERVER['REQUEST_URI']) 
        . "/gold_prices.php";

$apiResponse = @file_get_contents($apiUrl);
if ($apiResponse) {
    $apiData = json_decode($apiResponse, true);
    if ($apiData && $apiData['success']) {
        echo "<p style='color: green;'>✅ API 運作正常</p>";
        echo "<p>數據來源: <strong>" . $apiData['source'] . "</strong></p>";
        echo "<p>基準價格: <strong>\$" . $apiData['base_price'] . "</strong></p>";
        echo "<h4>交易所報價:</h4>";
        echo "<table border='1' cellpadding='8'>";
        echo "<tr><th>交易所</th><th>買入價</th><th>賣出價</th><th>點差</th></tr>";
        foreach ($apiData['exchanges'] as $ex) {
            $spread = round($ex['ask'] - $ex['bid'], 2);
            echo "<tr>";
            echo "<td>{$ex['name']}</td>";
            echo "<td>\${$ex['bid']}</td>";
            echo "<td>\${$ex['ask']}</td>";
            echo "<td>\${$spread}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
} else {
    echo "<p style='color: orange;'>⚠️ 無法測試本地 API（請直接訪問 gold_prices.php）</p>";
}

echo "<hr>";
echo "<p><a href='gold_prices.php'>📊 直接查看 API JSON 輸出</a></p>";
echo "<p><a href='../'>🏠 返回首頁</a></p>";
?>
