<?php
/**
 * 智能助手 - 聊天機器人 API
 * 
 * 功能：
 * 1. 接收用戶問題
 * 2. 從知識庫搜尋相關內容
 * 3. 使用關鍵字匹配或 LLM 生成回答
 */

require_once 'config.php';

// 設定 CORS
header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGINS);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// 處理 OPTIONS 請求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 只接受 POST 請求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => '只接受 POST 請求']);
    exit();
}

// 取得用戶輸入
$input = json_decode(file_get_contents('php://input'), true);
$userMessage = trim($input['message'] ?? '');

if (empty($userMessage)) {
    echo json_encode(['error' => '請輸入問題']);
    exit();
}

// 載入知識庫
$knowledgeBase = loadKnowledgeBase();

// 搜尋相關知識
$relevantKnowledge = searchKnowledge($userMessage, $knowledgeBase);

// 生成回答
$response = generateResponse($userMessage, $relevantKnowledge);

echo json_encode([
    'success' => true,
    'message' => $response,
    'timestamp' => date('Y-m-d H:i:s')
]);

/**
 * 載入知識庫文件
 */
function loadKnowledgeBase() {
    $knowledge = [];
    $files = glob(KNOWLEDGE_BASE_PATH . '*.md');
    
    foreach ($files as $file) {
        $content = file_get_contents($file);
        $filename = basename($file, '.md');
        $knowledge[$filename] = $content;
    }
    
    return $knowledge;
}

/**
 * 根據關鍵字搜尋相關知識
 */
function searchKnowledge($query, $knowledgeBase) {
    $results = [];
    $queryLower = mb_strtolower($query);
    
    // 定義關鍵字對應的知識庫文件（只保留套利相關）
    $keywordMap = [
        '套利' => ['faq_arbitrage'],
        '跨期' => ['faq_arbitrage'],
        '期現' => ['faq_arbitrage'],
        '黃金' => ['faq_arbitrage'],
        '價差' => ['faq_arbitrage'],
        '風險' => ['faq_arbitrage'],
        '資金' => ['faq_arbitrage'],
        '交易' => ['faq_arbitrage'],
        '利潤' => ['faq_arbitrage'],
        '機會' => ['faq_arbitrage'],
    ];
    
    // 根據關鍵字找到相關文件
    $matchedFiles = [];
    foreach ($keywordMap as $keyword => $files) {
        if (mb_strpos($queryLower, $keyword) !== false) {
            $matchedFiles = array_merge($matchedFiles, $files);
        }
    }
    $matchedFiles = array_unique($matchedFiles);
    
    // 如果沒有匹配，返回所有知識庫
    if (empty($matchedFiles)) {
        $matchedFiles = array_keys($knowledgeBase);
    }
    
    // 取得相關內容
    foreach ($matchedFiles as $file) {
        if (isset($knowledgeBase[$file])) {
            $results[] = $knowledgeBase[$file];
        }
    }
    
    return implode("\n\n---\n\n", $results);
}

/**
 * 生成回答
 */
function generateResponse($query, $knowledge) {
    // 預定義的套利常見問題回答
    $predefinedAnswers = [
        '什麼是套利' => '套利交易是利用**同一資產在不同市場的價格差異**來獲取利潤的策略。例如：當黃金期貨在 A 交易所價格較低、B 交易所價格較高時，同時在 A 買入、在 B 賣出，賺取中間的價差。

套利的優勢是**風險相對較低**，因為買賣同時進行，不受市場單邊漲跌影響。',

        '套利風險' => '套利交易的主要風險包括：
1. **執行風險**：下單延遲可能導致無法同時成交
2. **流動性風險**：市場深度不足時難以執行
3. **手續費風險**：價差可能被交易成本吃掉
4. **滑價風險**：實際成交價格與預期不同

建議使用程式交易搭配低延遲網路來降低風險。',

        '需要多少資金' => '套利所需資金取決於：
- 交易商品的保證金需求
- 同時持有正反向部位的保證金
- 建議準備預期單筆套利金額的 **10-20 倍**作為緩衝

以期貨套利為例，至少需要兩個方向的保證金加上維持保證金的緩衝。',

        '工具如何運作' => '本套利監測工具的運作原理：
1. **即時連接多個交易所報價**
2. **計算各交易所間的價差**
3. **當價差超過設定閾值時發出提醒**
4. **協助您捕捉套利機會**

系統延遲低於 50ms，確保您不錯過任何機會！',

        '如何加入' => '非常感謝您的興趣！加入方式如下：

1. 📧 聯繫我們安排產品說明會
2. 📝 了解系統功能與費用方案
3. ✅ 完成註冊與交易所帳戶綁定
4. 🚀 開始使用監測系統

👉 **[點此加入 LINE 諮詢](https://lin.ee/9uP8BA8)**

我們的專人將為您提供一對一服務，期待與您合作！',

        '黃金' => '黃金期貨套利具有獨特優勢：

🥇 **流動性高**：黃金是全球交易量最大的商品之一
🥇 **價差穩定**：主流交易所間常存在可套利空間
🥇 **24小時交易**：跨時區套利機會更多
🥇 **避險屬性**：黃金本身具保值特性

搭配專業工具，可實現穩健的套利收益。',

        '優勢' => '黃金期貨套利具有獨特優勢：

🥇 **流動性高**：黃金是全球交易量最大的商品之一
🥇 **價差穩定**：主流交易所間常存在可套利空間
🥇 **24小時交易**：跨時區套利機會更多
🥇 **避險屬性**：黃金本身具保值特性

搭配專業工具，可實現穩健的套利收益。',
    ];
    
    // 檢查是否匹配預定義問題
    $queryLower = mb_strtolower($query);
    foreach ($predefinedAnswers as $keyword => $answer) {
        if (mb_strpos($queryLower, mb_strtolower($keyword)) !== false) {
            return $answer;
        }
    }
    
    // 如果沒有預定義答案，嘗試從知識庫中擷取
    if (LLM_PROVIDER === 'openai' && OPENAI_API_KEY !== 'your-openai-api-key-here') {
        return callOpenAI($query, $knowledge);
    }
    
    // 預設回覆
    return DEFAULT_REPLY;
}

/**
 * 呼叫 OpenAI API (可選)
 */
function callOpenAI($query, $knowledge) {
    $url = 'https://api.openai.com/v1/chat/completions';
    
    $data = [
        'model' => OPENAI_MODEL,
        'messages' => [
            ['role' => 'system', 'content' => SYSTEM_PROMPT . "\n\n知識庫內容：\n" . mb_substr($knowledge, 0, 8000)],
            ['role' => 'user', 'content' => $query]
        ],
        'max_tokens' => MAX_RESPONSE_LENGTH,
        'temperature' => TEMPERATURE
    ];
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . OPENAI_API_KEY
        ]
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        return $result['choices'][0]['message']['content'] ?? DEFAULT_REPLY;
    }
    
    return DEFAULT_REPLY;
}
