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
  }
};
