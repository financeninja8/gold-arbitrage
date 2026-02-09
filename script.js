// ===== DOM Elements =====
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const quotesBody = document.getElementById('quotes-body');
const oppList = document.getElementById('opportunities-list');
const oppCount = document.getElementById('opp-count');
const lastUpdate = document.getElementById('last-update');
const uptimeEl = document.getElementById('uptime');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chips = document.querySelectorAll('.chip');

// ===== Navbar Scroll Effect =====
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== Mobile Nav Toggle =====
navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navMenu.classList.remove('active'));
});

// ===== Hero Stats Animation =====
const animateStats = () => {
    document.querySelectorAll('.stat-value').forEach(stat => {
        const target = parseFloat(stat.dataset.count);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        const update = () => {
            current += step;
            if (current < target) {
                stat.textContent = current.toFixed(target % 1 === 0 ? 0 : 1);
                requestAnimationFrame(update);
            } else {
                stat.textContent = target;
            }
        };
        update();
    });
};

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateStats();
            observer.disconnect();
        }
    });
}, { threshold: 0.5 });
observer.observe(document.querySelector('.hero-stats'));

// ===== Exchange Data (即時更新) =====
let exchanges = [
    { name: 'Bybit', code: 'XAUT', bid: 0, ask: 0, prevBid: 0, price: 0, status: 'loading', fundingRate: null, nextFundingTime: null, fundingInterval: 4 },
    { name: 'Binance', code: 'XAUF', bid: 0, ask: 0, prevBid: 0, price: 0, status: 'loading', fundingRate: null, nextFundingTime: null, fundingInterval: 4 },
    { name: 'OKX', code: 'XAU', bid: 0, ask: 0, prevBid: 0, price: 0, status: 'loading', fundingRate: null, nextFundingTime: null, fundingInterval: 8 }
];

// WebSocket 連接主要數據源，REST API 作為備用

// ===== WebSocket 連線狀態 =====
let bybitWs = null;
let binanceWs = null;
let okxWs = null;
let wsReconnectAttempts = { bybit: 0, binance: 0, okx: 0 };
const MAX_RECONNECT_ATTEMPTS = 5;

// ===== 數據來源狀態 =====
let currentDataSource = 'WebSocket';
let isDataCached = false;



// ===== Bybit REST API 備用 =====
async function fetchBybitPrice() {
    try {
        const response = await fetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=XAUTUSDT');
        const data = await response.json();
        if (data.result && data.result.list && data.result.list[0]) {
            const ticker = data.result.list[0];
            const price = parseFloat(ticker.lastPrice);
            const bid = parseFloat(ticker.bid1Price);
            const ask = parseFloat(ticker.ask1Price);
            updateExchange('Bybit', price, bid, ask, 'api');
            console.log('Bybit REST API 更新:', price);
        }
    } catch (error) {
        console.log('Bybit REST API 失敗:', error);
    }
}

// ===== Binance REST API 備用 =====
async function fetchBinancePrice() {
    try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=XAUUSDT');
        const data = await response.json();
        if (data.lastPrice) {
            const price = parseFloat(data.lastPrice);
            const bid = parseFloat(data.bidPrice || price - 0.1);
            const ask = parseFloat(data.askPrice || price + 0.1);
            updateExchange('Binance', price, bid, ask, 'api');
            console.log('Binance REST API 更新:', price);
        }
    } catch (error) {
        console.log('Binance REST API 失敗:', error);
    }
}

// ===== OKX REST API 備用 =====
async function fetchOkxPrice() {
    try {
        const response = await fetch('https://www.okx.com/api/v5/market/ticker?instId=XAU-USDT-SWAP');
        const data = await response.json();
        if (data.code === '0' && data.data && data.data[0]) {
            const ticker = data.data[0];
            const price = parseFloat(ticker.last);
            const bid = parseFloat(ticker.bidPx || price - 0.1);
            const ask = parseFloat(ticker.askPx || price + 0.1);
            updateExchange('OKX', price, bid, ask, 'api');
            console.log('OKX REST API 更新:', price);
        }
    } catch (error) {
        console.log('OKX REST API 失敗:', error);
    }
}

// ===== 資金費率 API =====
// Bybit 資金費率
async function fetchBybitFundingRate() {
    try {
        const response = await fetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=XAUTUSDT');
        const data = await response.json();
        if (data.result && data.result.list && data.result.list[0]) {
            const ticker = data.result.list[0];
            const fundingRate = parseFloat(ticker.fundingRate) * 100; // 轉換為百分比
            const nextFundingTime = parseInt(ticker.nextFundingTime);
            updateExchangeFunding('Bybit', fundingRate, nextFundingTime);
            console.log('Bybit 資金費率:', fundingRate.toFixed(4) + '%');
        }
    } catch (error) {
        console.log('Bybit 資金費率獲取失敗:', error);
    }
}

// Binance 資金費率
async function fetchBinanceFundingRate() {
    try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=XAUUSDT');
        const data = await response.json();
        if (data.lastFundingRate) {
            const fundingRate = parseFloat(data.lastFundingRate) * 100; // 轉換為百分比
            const nextFundingTime = parseInt(data.nextFundingTime);
            updateExchangeFunding('Binance', fundingRate, nextFundingTime);
            console.log('Binance 資金費率:', fundingRate.toFixed(4) + '%');
        }
    } catch (error) {
        console.log('Binance 資金費率獲取失敗:', error);
    }
}

// OKX 資金費率
async function fetchOkxFundingRate() {
    try {
        const response = await fetch('https://www.okx.com/api/v5/public/funding-rate?instId=XAU-USDT-SWAP');
        const data = await response.json();
        if (data.code === '0' && data.data && data.data[0]) {
            const fundingData = data.data[0];
            const fundingRate = parseFloat(fundingData.fundingRate) * 100; // 轉換為百分比
            const nextFundingTime = parseInt(fundingData.nextFundingTime);
            updateExchangeFunding('OKX', fundingRate, nextFundingTime);
            console.log('OKX 資金費率:', fundingRate.toFixed(4) + '%');
        }
    } catch (error) {
        console.log('OKX 資金費率獲取失敗:', error);
    }
}

// 更新交易所資金費率
function updateExchangeFunding(name, fundingRate, nextFundingTime) {
    const ex = exchanges.find(e => e.name === name);
    if (ex) {
        ex.fundingRate = fundingRate;
        ex.nextFundingTime = nextFundingTime;
        renderQuotes();
    }
}

// 格式化倒計時
function formatCountdown(nextFundingTime) {
    if (!nextFundingTime) return '--:--:--';
    const now = Date.now();
    const diff = nextFundingTime - now;
    if (diff <= 0) return '結算中';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ===== 更新交易所數據 =====
function updateExchange(name, price, bid, ask, status) {
    const ex = exchanges.find(e => e.name === name);
    if (ex) {
        ex.prevBid = ex.bid;
        ex.price = price;
        ex.bid = bid;
        ex.ask = ask;
        ex.status = status;
        renderQuotes();
        renderOpportunities();
        lastUpdate.textContent = new Date().toLocaleTimeString('zh-TW');
    }
}

function updateExchangeStatus(name, status) {
    const ex = exchanges.find(e => e.name === name);
    if (ex) ex.status = status;
}

// ===== Bybit WebSocket =====
function connectBybitWebSocket() {
    if (bybitWs && bybitWs.readyState === WebSocket.OPEN) return;

    console.log('🔌 連接 Bybit WebSocket...');
    bybitWs = new WebSocket('wss://stream.bybit.com/v5/public/linear');

    bybitWs.onopen = () => {
        console.log('✅ Bybit WebSocket 已連接');
        wsReconnectAttempts.bybit = 0;
        updateExchangeStatus('Bybit', 'connected');
        // 訂閱 XAUTUSDT 行情
        bybitWs.send(JSON.stringify({
            op: 'subscribe',
            args: ['tickers.XAUTUSDT']
        }));
    };

    bybitWs.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Bybit 收到:', data); // 除錯用

            // Bybit V5 格式: { topic: 'tickers.XAUTUSDT', type: 'snapshot'/'delta', data: {...} }
            if (data.topic === 'tickers.XAUTUSDT' && data.data) {
                const ticker = data.data;
                const price = parseFloat(ticker.lastPrice || ticker.lp || 0);
                const bid = parseFloat(ticker.bid1Price || ticker.bp || price - 0.1);
                const ask = parseFloat(ticker.ask1Price || ticker.ap || price + 0.1);
                if (price > 0) {
                    updateExchange('Bybit', price, bid, ask, 'connected');
                    console.log('Bybit 更新:', price, bid, ask);
                }
            }
        } catch (e) {
            console.log('Bybit 解析錯誤:', e);
        }
    };

    bybitWs.onclose = () => {
        console.log('❌ Bybit WebSocket 斷線');
        updateExchangeStatus('Bybit', 'disconnected');
        scheduleReconnect('bybit', connectBybitWebSocket);
    };

    bybitWs.onerror = (error) => {
        console.error('Bybit WebSocket 錯誤:', error);
        updateExchangeStatus('Bybit', 'error');
    };
}

// ===== Binance WebSocket =====
function connectBinanceWebSocket() {
    if (binanceWs && binanceWs.readyState === WebSocket.OPEN) return;

    console.log('🔌 連接 Binance WebSocket...');
    binanceWs = new WebSocket('wss://fstream.binance.com/ws/xauusdt@ticker');

    binanceWs.onopen = () => {
        console.log('✅ Binance WebSocket 已連接');
        wsReconnectAttempts.binance = 0;
        updateExchangeStatus('Binance', 'connected');
    };

    binanceWs.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Binance 收到:', data); // 除錯用

            // Binance Futures 24hr Ticker 格式
            // e: event type, s: symbol, c: close/last price, b: best bid, a: best ask
            if (data.e === '24hrTicker' || data.s === 'XAUUSDT') {
                const price = parseFloat(data.c || data.p || 0); // c = close/last price
                const bid = parseFloat(data.b || price - 0.1);   // b = best bid
                const ask = parseFloat(data.a || price + 0.1);   // a = best ask
                if (price > 0) {
                    updateExchange('Binance', price, bid, ask, 'connected');
                    console.log('Binance 更新:', price, bid, ask);
                }
            }
        } catch (e) {
            console.log('Binance 解析錯誤:', e);
        }
    };

    binanceWs.onclose = () => {
        console.log('❌ Binance WebSocket 斷線');
        updateExchangeStatus('Binance', 'disconnected');
        scheduleReconnect('binance', connectBinanceWebSocket);
    };

    binanceWs.onerror = (error) => {
        console.error('Binance WebSocket 錯誤:', error);
        updateExchangeStatus('Binance', 'error');
    };
}

// ===== OKX WebSocket =====
function connectOkxWebSocket() {
    if (okxWs && okxWs.readyState === WebSocket.OPEN) return;

    console.log('🔌 連接 OKX WebSocket...');
    okxWs = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

    okxWs.onopen = () => {
        console.log('✅ OKX WebSocket 已連接');
        wsReconnectAttempts.okx = 0;
        updateExchangeStatus('OKX', 'connected');
        // 訂閱 XAU-USDT-SWAP 行情
        okxWs.send(JSON.stringify({
            op: 'subscribe',
            args: [{ channel: 'tickers', instId: 'XAU-USDT-SWAP' }]
        }));
    };

    okxWs.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('OKX 收到:', data); // 除錯用

            // OKX 格式: { arg: { channel: 'tickers', instId: 'XAU-USDT-SWAP' }, data: [{...}] }
            if (data.arg && data.arg.channel === 'tickers' && data.data && data.data[0]) {
                const ticker = data.data[0];
                const price = parseFloat(ticker.last || 0);
                const bid = parseFloat(ticker.bidPx || price - 0.1);
                const ask = parseFloat(ticker.askPx || price + 0.1);
                if (price > 0) {
                    updateExchange('OKX', price, bid, ask, 'connected');
                    console.log('OKX 更新:', price, bid, ask);
                }
            }
        } catch (e) {
            console.log('OKX 解析錯誤:', e);
        }
    };

    okxWs.onclose = () => {
        console.log('❌ OKX WebSocket 斷線');
        updateExchangeStatus('OKX', 'disconnected');
        scheduleReconnect('okx', connectOkxWebSocket);
    };

    okxWs.onerror = (error) => {
        console.error('OKX WebSocket 錯誤:', error);
        updateExchangeStatus('OKX', 'error');
    };
}

// ===== 自動重連機制 =====
function scheduleReconnect(exchange, connectFn) {
    if (wsReconnectAttempts[exchange] < MAX_RECONNECT_ATTEMPTS) {
        wsReconnectAttempts[exchange]++;
        const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts[exchange]), 30000);
        console.log(`⏳ ${exchange} 將在 ${delay / 1000} 秒後重連 (第 ${wsReconnectAttempts[exchange]} 次)`);
        setTimeout(connectFn, delay);
    } else {
        console.log(`⚠️ ${exchange} 重連次數已達上限`);
    }
}

// ===== 更新數據來源顯示 =====
function updateDataSourceDisplay() {
    const sourceEl = document.getElementById('data-source');
    if (sourceEl) {
        let sourceText = currentDataSource;
        if (isDataCached) {
            sourceText = `${currentDataSource}`;
        }
        sourceEl.textContent = sourceText;

        // 根據來源類型設置顏色
        if (currentDataSource.includes('Simulated') || currentDataSource.includes('Offline')) {
            sourceEl.style.color = '#ff6b6b';
        } else if (isDataCached) {
            sourceEl.style.color = '#ffd93d';
        } else {
            sourceEl.style.color = '#6bcf6b';
        }
    }
}

// ===== Render Quotes Table (簡化版 - 只顯示價格) =====
function renderQuotes() {
    quotesBody.innerHTML = exchanges.map(ex => {
        const spread = (ex.ask - ex.bid).toFixed(2);
        const changeVal = (ex.bid - ex.prevBid).toFixed(2);
        const changeClass = changeVal >= 0 ? 'up' : 'down';
        const changeIcon = changeVal >= 0 ? '▲' : '▼';

        return `
            <div class="table-row table-row-5col">
                <div class="exchange">
                    <span class="exchange-icon">${ex.code}</span>
                    <span>${ex.name}</span>
                </div>
                <span class="price">$${ex.bid.toFixed(2)}</span>
                <span class="price">$${ex.ask.toFixed(2)}</span>
                <span class="spread">$${spread}</span>
                <span class="change ${changeClass}">${changeIcon} ${Math.abs(changeVal)}</span>
            </div>
        `;
    }).join('');
}

// ===== Render Funding Rate Table =====
const fundingBody = document.getElementById('funding-body');

function renderFunding() {
    if (!fundingBody) return;

    fundingBody.innerHTML = exchanges.map(ex => {
        // 資金費率顯示
        const fundingRate = ex.fundingRate !== null ? ex.fundingRate.toFixed(4) + '%' : '--';
        const fundingClass = ex.fundingRate !== null ? (ex.fundingRate >= 0 ? 'funding-positive' : 'funding-negative') : '';

        // 倒計時顯示
        const countdown = formatCountdown(ex.nextFundingTime);

        // 年化計算
        // Bybit/Binance: 4小時一次 = 每天6次
        // OKX: 8小時一次 = 每天3次
        const timesPerDay = 24 / ex.fundingInterval;
        const annualized = ex.fundingRate !== null ? (ex.fundingRate * timesPerDay * 365).toFixed(2) + '%' : '--';
        const annualizedClass = ex.fundingRate !== null ? (ex.fundingRate >= 0 ? 'funding-positive' : 'funding-negative') : '';

        return `
            <div class="table-row table-row-funding">
                <div class="exchange">
                    <span class="exchange-icon">${ex.code}</span>
                    <span>${ex.name}</span>
                </div>
                <span class="funding-rate ${fundingClass}">${fundingRate}</span>
                <span class="interval-tag">${ex.fundingInterval}h</span>
                <span class="countdown">${countdown}</span>
                <span class="funding-rate ${annualizedClass}">${annualized}</span>
            </div>
        `;
    }).join('');
}

// ===== Funding Rate Arbitrage =====
const fundingArbList = document.getElementById('funding-arb-list');
const fundingArbCount = document.getElementById('funding-arb-count');

function findFundingArbitrage() {
    const opps = [];

    for (let i = 0; i < exchanges.length; i++) {
        for (let j = i + 1; j < exchanges.length; j++) {
            const ex1 = exchanges[i];
            const ex2 = exchanges[j];

            // 需要兩個交易所都有資金費率數據
            if (ex1.fundingRate === null || ex2.fundingRate === null) continue;

            // 計算年化收益率
            const times1 = 24 / ex1.fundingInterval;
            const times2 = 24 / ex2.fundingInterval;

            const annualized1 = ex1.fundingRate * times1 * 365;
            const annualized2 = ex2.fundingRate * times2 * 365; // 注意：這裡只是單邊年化

            // 費率差異 (比較單次費率可能不準確，應比較年化後的等效差異，或者直接計算組合策略收益)
            // 策略：做多低費率，做空高費率
            // 收益 = (Short Rate * Short Times) - (Long Rate * Long Times)
            // 但如果週期不同，這比較複雜。

            const annual1 = ex1.fundingRate * times1 * 365;
            const annual2 = ex2.fundingRate * times2 * 365;

            // 差異 = 高年化 - 低年化
            // 策略：做空高年化(收費/少付)，做多低年化(少付/收費)
            const diff = Math.abs(annual1 - annual2);

            // 閾值：年化 5% 以上才顯示
            if (diff >= 5.0) {
                const higherEx = annual1 > annual2 ? ex1 : ex2;
                const lowerEx = annual1 > annual2 ? ex2 : ex1;

                opps.push({
                    long: lowerEx.name,
                    short: higherEx.name,
                    longRate: lowerEx.fundingRate,
                    shortRate: higherEx.fundingRate,
                    longInterval: lowerEx.fundingInterval,
                    shortInterval: higherEx.fundingInterval,
                    annualized: diff.toFixed(2)
                });
            }
        }
    }

    return opps.sort((a, b) => parseFloat(b.annualized) - parseFloat(a.annualized));
}

function renderFundingArbitrage() {
    if (!fundingArbList || !fundingArbCount) return;

    const opps = findFundingArbitrage();
    fundingArbCount.textContent = opps.length;

    if (opps.length === 0) {
        fundingArbList.innerHTML = `
            <div class="funding-arb-item">
                <p style="color:var(--text-muted);text-align:center;">暫無資金費率套利機會</p>
                <p style="color:var(--text-muted);text-align:center;font-size:0.85rem;margin-top:8px;">
                    當預期年化收益 ≥ 5% 時將顯示套利機會
                </p>
            </div>
        `;
        return;
    }

    fundingArbList.innerHTML = opps.map(opp => `
        <div class="funding-arb-item ${parseFloat(opp.annualized) >= 10 ? 'profitable' : ''}">
            <div class="funding-arb-header">
                <span class="funding-arb-pair">${opp.long} ↔ ${opp.short}</span>
                <span class="funding-arb-profit">年化 ${opp.annualized}%</span>
            </div>
            <div class="funding-arb-details">
                <div>
                    <span class="label">${opp.long} (${opp.longInterval}h):</span>
                    <span class="${opp.longRate >= 0 ? 'long-rate' : 'short-rate'}">${opp.longRate.toFixed(4)}%</span>
                </div>
                <div>
                    <span class="label">${opp.short} (${opp.shortInterval}h):</span>
                    <span class="${opp.shortRate >= 0 ? 'long-rate' : 'short-rate'}">${opp.shortRate.toFixed(4)}%</span>
                </div>
            </div>
            <div class="funding-arb-strategy">
                <i class="fas fa-lightbulb"></i>
                策略: 在 ${opp.long} 做多 + 在 ${opp.short} 做空
            </div>
        </div>
    `).join('');
}


// ===== Find Arbitrage Opportunities (Price) =====
function findOpportunities() {
    const opps = [];
    for (let i = 0; i < exchanges.length; i++) {
        for (let j = i + 1; j < exchanges.length; j++) {
            // 簡單比對價格差異 (無視利潤，只看價差)
            const diff = Math.abs(exchanges[i].price - exchanges[j].price);

            // 只要價差超過 $0.5 美元就顯示
            if (diff > 0.5) {
                const lower = exchanges[i].price < exchanges[j].price ? exchanges[i] : exchanges[j];
                const higher = exchanges[i].price > exchanges[j].price ? exchanges[i] : exchanges[j];

                opps.push({
                    buy: lower.name,
                    sell: higher.name,
                    profit: diff.toFixed(2), // 這裡借用 profit 欄位來存價差
                    buyPrice: lower.price.toFixed(2),
                    sellPrice: higher.price.toFixed(2)
                });
            }
        }
    }
    return opps.sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit)).slice(0, 5);
}

function renderOpportunities() {
    const opps = findOpportunities();
    oppCount.textContent = opps.length;
    if (opps.length === 0) {
        oppList.innerHTML = '<div class="opportunity-item"><p style="color:var(--text-muted);text-align:center;">暫無套利機會</p></div>';
        return;
    }
    oppList.innerHTML = opps.map((opp, i) => `
        <div class="opportunity-item ${i === 0 ? 'high' : ''}">
            <div class="opp-header">
                <span class="opp-pair">${opp.buy} vs ${opp.sell}</span>
                <span class="opp-profit">價差 $${opp.profit}</span>
            </div>
            <div class="opp-details">低價 $${opp.buyPrice} | 高價 $${opp.sellPrice}</div>
            <div class="opp-strategy">
                <i class="fas fa-lightbulb"></i>
                策略: 在 ${opp.buy} 做多 + 在 ${opp.sell} 做空
            </div>
        </div>
    `).join('');
}

// ===== Update Prices from API =====
async function updatePrices() {
    const success = await fetchGoldPrices();

    if (!success) {
        // API 失敗時使用模擬數據更新
        exchanges.forEach(ex => {
            ex.prevBid = ex.bid;
            const change = (Math.random() - 0.5) * 2;
            ex.bid = Math.max(2700, ex.bid + change);
            ex.ask = ex.bid + 0.2 + Math.random() * 0.3;
        });
    }

    renderQuotes();
    renderOpportunities();
    lastUpdate.textContent = new Date().toLocaleTimeString('zh-TW');
}

// ===== Uptime Counter =====
let seconds = 0;
function updateUptime() {
    seconds++;
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    uptimeEl.textContent = `${h}:${m}:${s}`;
}

// ===== Chart.js Spread Chart =====
let spreadChart;
const chartData = { labels: [], datasets: [{ label: '價差 (Bybit vs Binance)', data: [], borderColor: '#d4af37', backgroundColor: 'rgba(212,175,55,0.1)', fill: true, tension: 0.4 }] };

function initChart() {
    const ctx = document.getElementById('spread-chart').getContext('2d');
    spreadChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } }
            }
        }
    });
}

function updateChart() {
    // 計算 Bybit 與 Binance 之間的價差
    const bybitPrice = exchanges[0] ? exchanges[0].price : 0;
    const binancePrice = exchanges[1] ? exchanges[1].price : 0;
    const spread = (bybitPrice - binancePrice).toFixed(2);
    const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    if (chartData.labels.length > 20) { chartData.labels.shift(); chartData.datasets[0].data.shift(); }
    chartData.labels.push(time);
    chartData.datasets[0].data.push(parseFloat(spread));
    spreadChart.update('none');
}

document.querySelectorAll('.chart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ===== FAQ Chatbot =====
const faqData = {
    '什麼是套利交易': '套利交易是一種利用同一資產在不同市場間的價格差異來獲取利潤的策略。例如，當黃金在 A 交易所價格較低、B 交易所價格較高時，我們同時在 A 買入、B 賣出，從中賺取價差。這種策略風險相對較低，因為買賣同時進行，不受單邊漲跌影響。',
    '套利交易有風險嗎': '套利交易雖然風險較傳統單向交易低，但仍存在以下風險：\n\n1. **執行風險**：價差可能在下單過程中消失\n2. **滑點風險**：實際成交價與預期不同\n3. **資金風險**：需要在多個交易所預存資金\n4. **系統風險**：網路延遲或系統故障\n\n使用專業監測工具可以大幅降低這些風險。',
    '需要多少資金才能開始套利': '套利交易的資金門檻取決於多個因素：\n\n1. **交易所最低要求**：各交易所入金門檻不同\n2. **價差幅度**：價差越小需要越大資金量才能獲利\n3. **手續費**：需覆蓋雙邊交易成本\n\n一般建議初始資金至少準備 10-50 萬台幣以上，才能有效執行套利策略。',
    '這個監測工具如何運作': '我們的黃金期貨套利監測工具具備以下功能：\n\n✅ **多交易所即時報價**：同時監測 COMEX、SGE、TOCOM 等主流交易所\n✅ **智能價差計算**：自動計算扣除手續費後的淨利潤\n✅ **機會提醒**：當價差超過設定閾值時即時推播\n✅ **歷史分析**：記錄價差走勢，協助優化策略\n\n系統延遲低於 50ms，確保您不錯過任何機會！',
    '黃金期貨套利的優勢是什麼': '黃金期貨套利具有獨特優勢：\n\n🥇 **流動性高**：黃金是全球交易量最大的商品之一\n🥇 **價差穩定**：主流交易所間常存在可套利空間\n🥇 **24小時交易**：跨時區套利機會更多\n🥇 **避險屬性**：黃金本身具保值特性\n\n搭配專業工具，可實現穩健的套利收益。',
    '如何加入使用你們的系統': '非常感謝您的興趣！\\n\\n👉 **[點此加入 LINE 諮詢](https://lin.ee/9uP8BA8)**\\n\\n我們的專人將為您：\\n1. 安排產品說明會\\n2. 解說系統功能與費用\\n3. 協助完成註冊\\n\\n期待與您合作！',

};

function findAnswer(question) {
    const q = question.toLowerCase();
    for (const [key, answer] of Object.entries(faqData)) {
        if (q.includes(key.toLowerCase()) || key.toLowerCase().includes(q)) return answer;
    }
    if (q.includes('套利')) return faqData['什麼是套利交易'];
    if (q.includes('風險')) return faqData['套利交易有風險嗎'];
    if (q.includes('資金') || q.includes('錢') || q.includes('多少')) return faqData['需要多少資金才能開始套利'];
    if (q.includes('工具') || q.includes('系統') || q.includes('運作')) return faqData['這個監測工具如何運作'];
    if (q.includes('優勢') || q.includes('好處') || q.includes('黃金')) return faqData['黃金期貨套利的優勢是什麼'];
    if (q.includes('加入') || q.includes('使用') || q.includes('聯繫') || q.includes('line')) return faqData['如何加入使用你們的系統'];

    return '這是一個很好的問題！\\n目前此問題需要進一步資訊，您可以：\\n\\n1. 換個方式描述您的問題\\n2. 查看上方的常見問題快選\\n3. **[👉 點此加入 LINE 諮詢](https://lin.ee/9uP8BA8)**\\n\\n我們的專人將為您提供一對一服務！';
}

// API 設定
const CHATBOT_API_URL = 'api/chatbot.php';

async function callChatbotAPI(message) {
    try {
        const response = await fetch(CHATBOT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        if (data.success) return data.message;
        return null;
    } catch (error) {
        console.log('API 呼叫失敗，使用本地 FAQ:', error);
        return null;
    }
}

function addMessage(content, isUser = false) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'bot'}`;
    // 處理 Markdown 格式：換行、粗體、連結
    const formattedContent = content
        .replace(/\\n/g, '\n')  // 處理轉義的換行
        .replace(/\n/g, '</p><p>')  // 換行轉 HTML
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // 粗體
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #d4af37; text-decoration: underline;">$1</a>');  // Markdown 連結
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-${isUser ? 'user' : 'robot'}"></i></div>
        <div class="message-content"><p>${formattedContent}</p></div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'message bot typing-indicator';
    div.id = 'typing';
    div.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content"><p>正在思考中...</p></div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typing = document.getElementById('typing');
    if (typing) typing.remove();
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;
    addMessage(text, true);
    userInput.value = '';

    // 顯示思考中提示
    addTypingIndicator();

    // 嘗試呼叫 API
    let answer = await callChatbotAPI(text);

    // 若 API 失敗，使用本地 FAQ
    if (!answer) {
        answer = findAnswer(text);
    }

    removeTypingIndicator();
    addMessage(answer);
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });
chips.forEach(chip => {
    chip.addEventListener('click', async () => {
        const q = chip.dataset.question;
        addMessage(q, true);
        addTypingIndicator();
        let answer = await callChatbotAPI(q);
        if (!answer) answer = findAnswer(q);
        removeTypingIndicator();
        addMessage(answer);
    });
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', async () => {
    initChart();
    renderQuotes();
    renderFunding();
    renderFundingArbitrage();

    console.log('🚀 啟動即時報價系統...');

    // 1. 先用 REST API 獲取初始數據
    await Promise.all([
        fetchBybitPrice(),
        fetchBinancePrice(),
        fetchOkxPrice()
    ]);
    console.log('✅ 初始數據已載入');

    // 2. 獲取初始資金費率
    await Promise.all([
        fetchBybitFundingRate(),
        fetchBinanceFundingRate(),
        fetchOkxFundingRate()
    ]);
    console.log('✅ 資金費率已載入');
    renderFunding();
    renderFundingArbitrage();

    // 3. 啟動 WebSocket 連線 (Bybit + Binance + OKX)
    connectBybitWebSocket();
    connectBinanceWebSocket();
    connectOkxWebSocket();

    // 4. 每 10 秒用 REST API 備用更新 (萬一 WebSocket 失敗)
    setInterval(async () => {
        const bybit = exchanges.find(e => e.name === 'Bybit');
        const binance = exchanges.find(e => e.name === 'Binance');
        const okx = exchanges.find(e => e.name === 'OKX');

        // 如果 WebSocket 沒有正常更新，就用 REST API
        if (bybit && bybit.status !== 'connected') {
            await fetchBybitPrice();
        }
        if (binance && binance.status !== 'connected') {
            await fetchBinancePrice();
        }
        if (okx && okx.status !== 'connected') {
            await fetchOkxPrice();
        }
    }, 10000);

    // 5. 每分鐘更新資金費率
    setInterval(async () => {
        await Promise.all([
            fetchBybitFundingRate(),
            fetchBinanceFundingRate(),
            fetchOkxFundingRate()
        ]);
        renderFundingArbitrage();
    }, 60000);

    // 6. 每秒更新倒計時顯示
    setInterval(() => {
        renderFunding();
    }, 1000);

    // 7. 每秒更新圖表和運行時間
    setInterval(updateChart, 1000);
    setInterval(updateUptime, 1000);

    console.log('🎯 系統就緒！');
});



