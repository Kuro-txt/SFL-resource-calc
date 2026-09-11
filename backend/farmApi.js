const axios = require('axios');

const SFL_API_KEY = process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || process.env.API_KEY || process.env.SUNFLOWER_API_KEY || process.env.VITE_SFL_API_KEY || "";
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getSflHeaders(customApiKey = '') {
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://sunflower-land.com/',
    'Origin': 'https://sunflower-land.com'
  };

  const keyToUse = (customApiKey && customApiKey.trim()) || (SFL_API_KEY && SFL_API_KEY.trim());
  if (keyToUse) {
    headers['x-api-key'] = keyToUse;
    headers['Authorization'] = `Bearer ${keyToUse}`;
  }

  return headers;
}

// ── Global Sequential Queue for Farm API Syncs (Concurrency = 1) ───────────
// Enforces strictly 1-by-1 execution.
// If an ID fetch succeeds, waits 8 seconds before fetching the next ID.
// If an ID fetch fails, retries 10 seconds later (up to 2 retries).
let syncQueueChain = Promise.resolve();
let lastSuccessTimestamp = 0;
const SUCCESS_COOLDOWN_MS = 8000; // 8 seconds wait after successful fetch before next ID

function queueFarmSync(taskFn) {
  const queuedTask = syncQueueChain.then(async () => {
    // If a previous fetch succeeded, ensure at least 8 seconds have passed before next fetch
    if (lastSuccessTimestamp > 0) {
      const elapsed = Date.now() - lastSuccessTimestamp;
      if (elapsed < SUCCESS_COOLDOWN_MS) {
        const remainingWait = SUCCESS_COOLDOWN_MS - elapsed;
        console.log(`⏳ [Sync Queue] Waiting ${(remainingWait / 1000).toFixed(1)}s before next farm ID...`);
        await delay(remainingWait);
      }
    }

    try {
      const result = await taskFn();
      lastSuccessTimestamp = Date.now();
      return result;
    } catch (err) {
      // Record timestamp on failure too so the next farm ID still has safe buffer
      lastSuccessTimestamp = Date.now();
      throw err;
    }
  });

  // Keep queue alive even if an individual task rejects
  syncQueueChain = queuedTask.catch(() => {});

  return queuedTask;
}

async function fetchFarmFullDataRaw(cleanFarmId, maxRetries = 2, customApiKey = '') {
  const totalAttempts = 1 + maxRetries; // 1 initial attempt + 2 retries = 3 attempts total

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const response = await axios.get(`https://api.sunflower-land.com/community/farms/${cleanFarmId}`, {
        headers: getSflHeaders(customApiKey),
        timeout: 15000
      });
      const farmObj = response.data?.farm || response.data || {};
      const inventory = farmObj.inventory || {};
      const farmActivity = {
        ...(farmObj.bumpkin?.activity || {}),
        ...(farmObj.activity || {}),
        ...(farmObj.farmActivity || {})
      };
      const npcs = farmObj.npcs || {};
      return { inventory, farmActivity, npcs, ...farmObj };
    } catch (err) {
      const status = err.response?.status;
      const errMsg = (err.message || '').toLowerCase();
      const errCode = err.code || '';

      const isTimeoutOrAbort = 
        errCode === 'ECONNABORTED' || 
        errCode === 'ETIMEDOUT' || 
        errCode === 'ERR_CANCELED' || 
        errCode === 'ECONNRESET' || 
        errMsg.includes('timeout') || 
        errMsg.includes('aborted') || 
        errMsg.includes('canceled');

      const isServerError = status >= 500 && status < 600;

      if (status === 401) {
        console.error(`❌ [401 Unauthorized] SFL API rejected Farm #${cleanFarmId}. Check SFL_API_KEY.`);
        throw err;
      }

      // If failed and retries remain (retry 1 on attempt 1 failure, retry 2 on attempt 2 failure)
      if (attempt <= maxRetries) {
        const waitTimeSec = 10; // Exactly 10 seconds later
        const reason = isTimeoutOrAbort ? `Network/Timeout (${err.code || err.message})` : (status ? `HTTP ${status}` : err.message);
        console.warn(`⚠️ [Farm #${cleanFarmId}] ${reason}. Retrying in ${waitTimeSec}s... (Retry ${attempt}/${maxRetries})`);
        await delay(waitTimeSec * 1000);
      } else {
        console.error(`❌ [Farm #${cleanFarmId}] Failed after ${maxRetries} retries: ${err.message}`);
        throw err;
      }
    }
  }
  return { inventory: {}, farmActivity: {}, npcs: {} };
}

async function fetchFarmFullDataWithRetry(cleanFarmId, maxRetries = 2, customApiKey = '') {
  return queueFarmSync(() => fetchFarmFullDataRaw(cleanFarmId, maxRetries, customApiKey));
}

function getStockAmount(stockObj, targetCleanKey) {
  if (!stockObj || typeof stockObj !== 'object') return 0;
  for (let k in stockObj) {
    let cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (cleanK === targetCleanKey) {
      let val = stockObj[k];
      let num = typeof val === 'number' ? val : parseFloat(val?.amount || val || 0);
      return isNaN(num) ? 0 : num;
    }
  }
  return 0;
}

function formatNftItem(item, parentKey = '') {
  if (!item || typeof item !== 'object') return null;

  const rawName = item.name || item.title || item.itemName || (isNaN(Number(parentKey)) && parentKey.length > 1 ? parentKey : '');
  const name = String(rawName).trim();

  if (!name || name === 'Unknown NFT' || ['success', 'status', 'message', 'updated_at', 'timestamp'].includes(name.toLowerCase())) {
    return null;
  }

  const rawPrice = item.floor ?? item.price ?? item.floorPrice ?? item.floor_price ?? item.lastSalePrice ?? item.sfl ?? 0;
  const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0;

  const boostText = String(item.boost_text || item.boost || item.details || '').trim();
  let boost = "No Boost";
  if (boostText) {
    boost = boostText;
  } else if (item.have_boost) {
    boost = "Boost Active";
  }

  return { name, price, boost };
}

module.exports = {
  getSflHeaders,
  fetchFarmFullDataWithRetry,
  fetchFarmFullDataRaw,
  queueFarmSync,
  delay,
  getStockAmount,
  formatNftItem
};
