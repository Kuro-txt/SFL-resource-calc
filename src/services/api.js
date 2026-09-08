import { BACKEND_URL } from '../config/constants.js';

// ── Client In-Memory Cache with TTL & In-Flight Deduplication ──────────────
const clientCache = new Map();
const inFlightRequests = new Map();

function getCached(key, ttlMs) {
  const item = clientCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > ttlMs) {
    clientCache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  if (clientCache.size > 500) {
    const oldestKey = clientCache.keys().next().value;
    clientCache.delete(oldestKey);
  }
  clientCache.set(key, { data, timestamp: Date.now() });
}

function fetchDeduplicated(key, fetcher) {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = (async () => {
    try {
      return await fetcher();
    } finally {
      inFlightRequests.delete(key);
    }
  })();
  inFlightRequests.set(key, promise);
  return promise;
}

export const ApiService = {
  clearCache(prefix = '') {
    if (!prefix) {
      clientCache.clear();
      return;
    }
    for (const k of clientCache.keys()) {
      if (k.includes(prefix)) clientCache.delete(k);
    }
  },

  async getPrices({ force = false } = {}) {
    const cacheKey = 'api_prices';
    if (!force) {
      const cached = getCached(cacheKey, 60 * 1000); // 60s
      if (cached) return cached;
    }
    return fetchDeduplicated(cacheKey, async () => {
      try {
        const url = `${BACKEND_URL}/api/get-data${force ? '?force=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const data = await response.json();
        setCached(cacheKey, data);
        return data;
      } catch (err) {
        console.warn("⚠️ Failed to load live prices:", err.message);
        return clientCache.get(cacheKey)?.data || null;
      }
    });
  },

  async getFarmFullData(farmId, apiKey = '', { force = false } = {}) {
    if (!farmId) throw new Error('Farm ID is required.');
    const cleanFarmId = String(farmId).trim();
    const cleanApiKey = apiKey ? String(apiKey).trim() : '';
    const cacheKey = `api_farm_full_${cleanFarmId}_${cleanApiKey ? 'vip' : 'anon'}`;

    if (!force) {
      const cached = getCached(cacheKey, 45 * 1000); // 45s
      if (cached) return cached;
    }

    return fetchDeduplicated(cacheKey, async () => {
      const url = `${BACKEND_URL}/api/get-farm?farmId=${encodeURIComponent(cleanFarmId)}&apiKey=${encodeURIComponent(cleanApiKey)}${force ? '&force=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP Error ${response.status}`);
      }

      const farmObj = data.farm?.farm || data.farm?.data || data.farm || data;
      setCached(cacheKey, farmObj);
      return farmObj;
    });
  },

  async getFarmInventory(farmId, apiKey = '', { force = false } = {}) {
    const farmObj = await this.getFarmFullData(farmId, apiKey, { force });
    return farmObj?.inventory || {};
  },

  async getNfts({ force = false } = {}) {
    const cacheKey = 'api_nfts';
    if (!force) {
      const cached = getCached(cacheKey, 15 * 60 * 1000); // 15 mins
      if (cached) return cached;
    }
    return fetchDeduplicated(cacheKey, async () => {
      try {
        const url = `${BACKEND_URL}/api/nfts${force ? '?force=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setCached(cacheKey, data);
        }
        return data;
      } catch (err) {
        console.warn("⚠️ Failed to load live NFTs:", err.message);
        return clientCache.get(cacheKey)?.data || [];
      }
    });
  },

  async getLandYields(farmId, { force = false } = {}) {
    if (!farmId) throw new Error('Farm ID is required.');
    const cleanFarmId = String(farmId).trim();
    const cacheKey = `api_land_${cleanFarmId}`;

    if (!force) {
      const cached = getCached(cacheKey, 180 * 1000); // 3 mins
      if (cached) return cached;
    }

    return fetchDeduplicated(cacheKey, async () => {
      try {
        const url = `${BACKEND_URL}/api/get-land?farmId=${encodeURIComponent(cleanFarmId)}${force ? '&force=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const result = await response.json();
        const landData = result.land || result;
        const yieldsMap = {};

        const extractYieldCategory = (categoryObj) => {
          if (!categoryObj || typeof categoryObj !== 'object') return;
          for (const [key, val] of Object.entries(categoryObj)) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            const avgYield = typeof val === 'object' && val !== null ? (val.avg ?? val.min ?? 1.0) : parseFloat(val) || 1.0;
            yieldsMap[cleanKey] = Math.round(avgYield * 100) / 100;
          }
        };

        extractYieldCategory(landData.crops);
        extractYieldCategory(landData.greenhouse);
        extractYieldCategory(landData.fruits);

        setCached(cacheKey, yieldsMap);
        return yieldsMap;
      } catch (err) {
        console.warn("⚠️ Failed to load live land yields from sfl.world:", err.message);
        return clientCache.get(cacheKey)?.data || null;
      }
    });
  },

  async getMarketplaceProfile(farmId, apiKey = '', { force = false } = {}) {
    if (!farmId) throw new Error('Farm ID is required.');
    const cleanFarmId = String(farmId).trim();
    const cleanApiKey = apiKey ? String(apiKey).trim() : '';
    const cacheKey = `api_marketplace_${cleanFarmId}`;

    if (!force) {
      const cached = getCached(cacheKey, 60 * 1000); // 60s
      if (cached) return cached;
    }

    return fetchDeduplicated(cacheKey, async () => {
      const endpoints = [
        `/api/get-marketplace?farmId=${encodeURIComponent(cleanFarmId)}&apiKey=${encodeURIComponent(cleanApiKey)}${force ? '&force=true' : ''}`,
        `${BACKEND_URL}/api/get-marketplace?farmId=${encodeURIComponent(cleanFarmId)}&apiKey=${encodeURIComponent(cleanApiKey)}${force ? '&force=true' : ''}`
      ];

      let lastError = null;

      for (const url of endpoints) {
        try {
          const response = await fetch(url);
          const text = await response.text();

          // Guard against HTML error pages
          if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
            continue;
          }

          const result = JSON.parse(text);
          if (!response.ok) {
            throw new Error(result.error || `HTTP Error ${response.status}`);
          }

          const resData = result.data?.data || result.data || result;
          setCached(cacheKey, resData);
          return resData;
        } catch (err) {
          lastError = err;
          if (err.message && (err.message.includes('API key') || err.message.includes('401'))) {
            throw err;
          }
        }
      }

      // Direct fallback to Sunflower Land Community API if direct browser request works
      if (cleanApiKey) {
        try {
          const directRes = await fetch(`https://api.sunflower-land.com/community/data?type=marketplaceProfile&farmId=${encodeURIComponent(cleanFarmId)}`, {
            headers: {
              'x-api-key': cleanApiKey,
              'Authorization': `Bearer ${cleanApiKey}`,
              'Accept': 'application/json'
            }
          });
          const directText = await directRes.text();
          if (!directText.trim().startsWith('<')) {
            const directData = JSON.parse(directText);
            if (!directRes.ok) throw new Error(directData.error || `HTTP Error ${directRes.status}`);
            const resData = directData.data || directData;
            setCached(cacheKey, resData);
            return resData;
          }
        } catch (e) {
          if (e.message && (e.message.includes('API key') || e.message.includes('401'))) throw e;
        }
      }

      const stale = clientCache.get(cacheKey)?.data;
      if (stale) return stale;
      throw lastError || new Error("Failed to load marketplace profile. Please check your Farm ID and VIP API Key.");
    });
  },

  async syncTradesToCloud(farmId, trades) {
    if (!farmId || !Array.isArray(trades) || trades.length === 0) return null;
    const cleanFarmId = String(farmId).trim();
    const endpoints = ['/api/trades'];
    if (typeof BACKEND_URL !== 'undefined' && BACKEND_URL && typeof window !== 'undefined' && BACKEND_URL !== window.location.origin) {
      endpoints.push(`${BACKEND_URL}/api/trades`);
    }

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmId: cleanFarmId, trades })
        });
        const text = await response.text();
        if (text.trim().startsWith('<')) continue;
        const data = JSON.parse(text);
        if (response.ok) {
          clientCache.delete(`api_cloud_trades_${cleanFarmId}`);
          return data;
        }
      } catch (e) {
        console.warn("⚠️ TiDB Cloud trade sync notice:", e.message);
      }
    }
    return null;
  },

  async getCloudTrades(farmId, { force = false } = {}) {
    if (!farmId) return null;
    const cleanFarmId = String(farmId).trim();
    const cacheKey = `api_cloud_trades_${cleanFarmId}`;

    if (!force) {
      const cached = getCached(cacheKey, 60 * 1000); // 60s
      if (cached) return cached;
    }

    return fetchDeduplicated(cacheKey, async () => {
      const endpoints = [`/api/trades?farmId=${encodeURIComponent(cleanFarmId)}`];
      if (typeof BACKEND_URL !== 'undefined' && BACKEND_URL && typeof window !== 'undefined' && BACKEND_URL !== window.location.origin) {
        endpoints.push(`${BACKEND_URL}/api/trades?farmId=${encodeURIComponent(cleanFarmId)}`);
      }

      for (const url of endpoints) {
        try {
          const response = await fetch(url);
          const text = await response.text();
          if (text.trim().startsWith('<')) continue;
          const data = JSON.parse(text);
          if (response.ok && data.success) {
            setCached(cacheKey, data);
            return data;
          }
        } catch (e) {
          console.warn("⚠️ TiDB Cloud fetch notice:", e.message);
        }
      }
      return clientCache.get(cacheKey)?.data || null;
    });
  }
};
