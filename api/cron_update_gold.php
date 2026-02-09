<?php
/**
 * 定時更新金價腳本 (Cron Job 使用)
 * 設定 Cron: 每日 08:00, 12:00, 20:00 執行
 * 
 * Cron 設定範例:
 * 0 8,12,20 * * * /usr/bin/php /home/您的帳號/public_html/api/cron_update_gold.php
 */

// 強制從 API 獲取最新價格並寫入緩存
$CACHE_FILE = __DIR__ . '/cache/gold_price_cache.json';

// 確保緩存目錄存在
if (!is_dir(__DIR__ . '/cache')) {
    mkdir(__DIR__ . '/cache', 0755, true);
}

/**
 * GoldPrice.org API（首選）
 */
function fetchGoldPriceOrg() {
    $url = 'https://data-asg.goldprice.org/dbXRates/USD';
    
    $opts = [
        'http' => [
            'method' => 'GET',
            'timeout' => 15,
            'header' => 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) return null;
    
    $data = json_decode($response, true);
    
    if (isset($data['items'][0]['xauPrice'])) {
        $price = floatval($data['items'][0]['xauPrice']);
        return [
            'price' => $price,
            'bid' => $price - 0.15,
            'ask' => $price + 0.15,
            'source' => 'GoldPrice.org'
        ];
    }
    return null;
}

/**
 * Metals.dev API（備用）
 */
function fetchMetalsDevPrice() {
    $url = 'https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=oz';
    
    $opts = [
        'http' => ['method' => 'GET', 'timeout' => 15],
        'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]
    ];
    
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) return null;
    
    $data = json_decode($response, true);
    
    if (isset($data['metals']['gold'])) {
        $price = floatval($data['metals']['gold']);
        return [
            'price' => $price,
            'bid' => $price - 0.15,
            'ask' => $price + 0.15,
            'source' => 'Metals.dev'
        ];
    }
    return null;
}

// ===== 主邏輯 =====
$logFile = __DIR__ . '/cache/cron_log.txt';
$timestamp = date('Y-m-d H:i:s');

// 嘗試獲取價格
$priceData = fetchGoldPriceOrg();
if (!$priceData) {
    $priceData = fetchMetalsDevPrice();
}

if ($priceData) {
    // 寫入緩存（設定超長過期時間，因為由 Cron 控制更新）
    $cacheData = [
        'timestamp' => time(),
        'source' => $priceData['source'],
        'base_price' => $priceData['price'],
        'base_bid' => $priceData['bid'],
        'base_ask' => $priceData['ask'],
        'update_time' => $timestamp
    ];
    
    file_put_contents($CACHE_FILE, json_encode($cacheData, JSON_PRETTY_PRINT));
    
    $log = "[$timestamp] SUCCESS: {$priceData['source']} - \${$priceData['price']}\n";
} else {
    $log = "[$timestamp] FAILED: All APIs failed\n";
}

// 記錄日誌
file_put_contents($logFile, $log, FILE_APPEND);

// 輸出結果（方便測試）
echo $log;
