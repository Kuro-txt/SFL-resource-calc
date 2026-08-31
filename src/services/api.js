import { BACKEND_URL } from '../config/constants.js';

export const ApiService = {
  async getPrices() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/get-data`);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn("⚠️ Failed to load live prices:", err.message);
      return null;
    }
  },

  async getFarmInventory(farmId, apiKey = '') {
    if (!farmId) throw new Error('Farm ID is required.');
    const url = `${BACKEND_URL}/api/get-farm?farmId=${encodeURIComponent(farmId)}&apiKey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP Error ${response.status}`);
    }

    const farmObj = data.farm?.farm || data.farm?.data || data.farm || data;
    return farmObj?.inventory || {};
  },

  async getNfts() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/nfts`);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn("⚠️ Failed to load live NFTs:", err.message);
      return [];
    }
  },

  async getLandYields(farmId) {
    if (!farmId) throw new Error('Farm ID is required.');
    try {
      const response = await fetch(`${BACKEND_URL}/api/get-land?farmId=${encodeURIComponent(farmId)}`);
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

      return yieldsMap;
    } catch (err) {
      console.warn("⚠️ Failed to load live land yields from sfl.world:", err.message);
      return null;
    }
  },

  async getMarketplaceProfile(farmId, apiKey = '') {
    if (!farmId) throw new Error('Farm ID is required.');
    const endpoints = [
      `/api/get-marketplace?farmId=${encodeURIComponent(farmId)}&apiKey=${encodeURIComponent(apiKey)}`,
      `${BACKEND_URL}/api/get-marketplace?farmId=${encodeURIComponent(farmId)}&apiKey=${encodeURIComponent(apiKey)}`
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

        return result.data?.data || result.data || result;
      } catch (err) {
        lastError = err;
        if (err.message && (err.message.includes('API key') || err.message.includes('401'))) {
          throw err;
        }
      }
    }

    // Direct fallback to Sunflower Land Community API if direct browser request works
    if (apiKey) {
      try {
        const directRes = await fetch(`https://api.sunflower-land.com/community/data?type=marketplaceProfile&farmId=${encodeURIComponent(farmId)}`, {
          headers: {
            'x-api-key': apiKey,
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });
        const directText = await directRes.text();
        if (!directText.trim().startsWith('<')) {
          const directData = JSON.parse(directText);
          if (!directRes.ok) throw new Error(directData.error || `HTTP Error ${directRes.status}`);
          return directData.data || directData;
        }
      } catch (e) {
        if (e.message && (e.message.includes('API key') || e.message.includes('401'))) throw e;
      }
    }

    throw lastError || new Error("Failed to load marketplace profile. Please check your Farm ID and VIP API Key.");
  },

  async syncTradesToCloud(farmId, trades) {
    if (!farmId || !Array.isArray(trades) || trades.length === 0) return null;
    const endpoints = [`/api/trades`, `${BACKEND_URL}/api/trades`];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmId, trades })
        });
        const text = await response.text();
        if (text.trim().startsWith('<')) continue;
        const data = JSON.parse(text);
        if (response.ok) return data;
      } catch (e) {
        console.warn("⚠️ TiDB Cloud trade sync notice:", e.message);
      }
    }
    return null;
  },

  async getCloudTrades(farmId) {
    if (!farmId) return null;
    const endpoints = [
      `/api/trades?farmId=${encodeURIComponent(farmId)}`,
      `${BACKEND_URL}/api/trades?farmId=${encodeURIComponent(farmId)}`
    ];

    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        const text = await response.text();
        if (text.trim().startsWith('<')) continue;
        const data = JSON.parse(text);
        if (response.ok && data.success) return data;
      } catch (e) {
        console.warn("⚠️ TiDB Cloud fetch notice:", e.message);
      }
    }
    return null;
  }
};
