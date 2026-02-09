<?php
/**
 * AI 策略助教 - 設定檔
 * 
 * 請根據您的需求修改以下設定
 */

// 錯誤顯示（正式環境請設為 false）
define('DEBUG_MODE', true);

// OpenAI API 設定（如果使用 OpenAI）
define('OPENAI_API_KEY', 'your-openai-api-key-here');
define('OPENAI_MODEL', 'gpt-3.5-turbo');

// 或使用其他 LLM API
define('LLM_PROVIDER', 'openai'); // 可選: 'openai', 'azure', 'custom'

// 知識庫路徑
define('KNOWLEDGE_BASE_PATH', __DIR__ . '/../knowledge_base/');

// 回應設定
define('MAX_RESPONSE_LENGTH', 2000);
define('TEMPERATURE', 0.7);

// 系統提示詞
define('SYSTEM_PROMPT', '你是「智能助手」，專門協助用戶了解黃金期貨套利交易策略。

你的專長包括：
1. 套利交易基礎知識（跨期套利、期現套利、跨交易所套利）
2. 黃金期貨市場分析
3. 套利機會識別與風險管理
4. 交易策略優化建議

回答規則：
- 使用繁體中文回答
- 回答要簡潔明瞭
- 如不確定，請誠實告知並建議用戶諮詢專業人士

請根據知識庫內容回答用戶的問題。');

// LINE@ 網址
define('LINE_URL', 'https://lin.ee/9uP8BA8');

// 預設回覆（當找不到答案時）
define('DEFAULT_REPLY', '這是一個很好的問題！
目前此問題需要進一步資訊，您可以：

1. 換個方式描述您的問題
2. 查看上方的常見問題快選
3. **[👉 點此加入 LINE 諮詢](https://lin.ee/9uP8BA8)**

我們的專人將為您提供一對一服務！');

// CORS 設定
define('ALLOWED_ORIGINS', '*');
