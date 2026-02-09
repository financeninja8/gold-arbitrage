<?php
/**
 * Gold Prices API Endpoint (Minimal)
 * 此檔案保留用於可能的後端需求
 * 目前所有報價由前端 JavaScript 直接從交易所 API 獲取
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// 回傳空數組，因為報價現在由前端處理
$response = [
    'success' => true,
    'timestamp' => date('c'),
    'source' => 'Frontend WebSocket/REST',
    'message' => 'Price data is now fetched directly by frontend JavaScript from Bybit and Binance APIs.',
    'exchanges' => []
];

echo json_encode($response, JSON_UNESCAPED_UNICODE);
