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
  }
};
