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

async function fetchFarmFullDataWithRetry(cleanFarmId, maxRetries = 5, customApiKey = '') {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(`https://api.sunflower-land.com/community/farms/${cleanFarmId}`, {
        headers: getSflHeaders(customApiKey),
        timeout: 15000
      });
      const farmObj = response.data?.farm || response.data || {};
      const inventory = farmObj.inventory || {};
      const farmActivity = farmObj.farmActivity || farmObj.activity || {};
      const npcs = farmObj.npcs || {};
      return { inventory, farmActivity, npcs };
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

      if ((status === 429 || isServerError || isTimeoutOrAbort) && attempt < maxRetries) {
        const retryHeader = err.response?.headers['retry-after'];
        const waitTimeSec = retryHeader ? Math.max(parseInt(retryHeader, 10), 10) : attempt * 8;
        const reason = isTimeoutOrAbort ? `Network/Timeout (${err.code || err.message})` : `HTTP ${status}`;
        console.warn(`⚠️ [Farm #${cleanFarmId}] ${reason}. Retrying in ${waitTimeSec}s... (Attempt ${attempt}/${maxRetries})`);
        await delay(waitTimeSec * 1000);
      } else {
        throw err;
      }
    }
  }
  return { inventory: {}, farmActivity: {}, npcs: {} };
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
  getStockAmount,
  formatNftItem
};
