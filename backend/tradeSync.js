const axios = require('axios');
const { getSflHeaders } = require('./farmApi');
const { getTiDBPool } = require('./db');
const { getItemNameById } = require('./knownIds');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchMarketplaceTradesWithRetry(farmId, apiKey = '', maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(`https://api.sunflower-land.com/community/data?type=marketplaceProfile&farmId=${encodeURIComponent(farmId)}`, {
        headers: getSflHeaders(apiKey),
        timeout: 15000
      });
      
      const payload = response.data?.data || response.data?.farm || response.data || {};
      const trades = Array.isArray(payload.trades) 
        ? payload.trades 
        : (Array.isArray(payload) ? payload : Object.values(payload.trades || {}));

      return trades;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        console.warn(`⚠️ [Farm #${farmId}] 401 Unauthorized (Check SFL API key). Skipping retries.`);
        throw err;
      }
      if (attempt < maxRetries) {
        console.warn(`⚠️ [Farm #${farmId}] Trade fetch attempt ${attempt}/${maxRetries} failed (${err.message}). Retrying in 13s...`);
        await delay(13000);
      } else {
        throw err;
      }
    }
  }
  return [];
}

async function processAutoSyncTrades(supabase) {
  console.log("🚀 [Auto-Sync Trades] Starting 4x daily marketplace trades auto-sync (:33 UTC, 13s gap, 3 retries)...");
  
  const farmMap = new Map();

  // 1. Fetch registered users from Supabase profiles
  try {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, farm_id');
    if (!pErr && Array.isArray(profiles)) {
      profiles.forEach(p => {
        if (p.farm_id) {
          const cleanId = String(p.farm_id).trim();
          if (cleanId) farmMap.set(cleanId, '');
        }
      });
    }
  } catch (e) {
    console.warn("Notice: Supabase profiles query:", e.message);
  }

  // 2. Fetch distinct farms from TiDB Cloud
  try {
    const pool = getTiDBPool();
    if (pool) {
      const [rows] = await pool.query("SELECT DISTINCT farm_id FROM user_trades;");
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          if (r.farm_id) {
            const cleanId = String(r.farm_id).trim();
            if (!farmMap.has(cleanId)) farmMap.set(cleanId, '');
          }
        });
      }
    }
  } catch (e) {
    console.warn("Notice: TiDB user_trades query:", e.message);
  }

  const farmEntries = Array.from(farmMap.entries());
  console.log(`📋 [Auto-Sync Trades] Found ${farmEntries.length} registered farms to sync.`);

  let totalSynced = 0;

  for (let i = 0; i < farmEntries.length; i++) {
    const [farmId, apiKey] = farmEntries[i];
    console.log(`[${i + 1}/${farmEntries.length}] ⏳ Fetching trades for Farm #${farmId} (3 retries, 13s gap)...`);

    try {
      const rawTrades = await fetchMarketplaceTradesWithRetry(farmId, apiKey, 3);
      if (rawTrades.length > 0) {
        const pool = getTiDBPool();
        if (pool) {
          for (const t of rawTrades) {
            const id = String(t.id || '').trim();
            if (!id) continue;

            const isListing = t.source === 'listing';
            const initId = String(t.initiatedBy?.id || '');
            const fulfId = String(t.fulfilledBy?.id || '');
            const isSeller = isListing ? (initId === farmId) : (fulfId !== farmId);

            const otherName = isSeller ? (t.fulfilledBy?.username || '') : (t.initiatedBy?.username || '');
            const otherId = isSeller ? (t.fulfilledBy?.id || null) : (t.initiatedBy?.id || null);

            const itemId = parseInt(t.itemId || 0, 10);
            const isEconomy = t.collection === 'economies' || Boolean(t.economy);
            const resolvedName = (t.itemName && !t.itemName.startsWith('Item #'))
              ? t.itemName
              : (t.name && !t.name.startsWith('Item #') ? t.name : getItemNameById(itemId || t.itemId));
            const itemName = isEconomy ? `#${itemId}` : String(resolvedName || `Item #${itemId}`).substring(0, 128);
            const quantity = parseFloat(t.quantity || 1);
            const sfl = parseFloat(t.sfl || 0);
            const tax = isSeller ? parseFloat(t.tax || 0) : 0;
            const netSfl = isSeller ? Math.max(0, sfl - tax) : sfl;
            const unitPrice = quantity > 0 ? (sfl / quantity) : sfl;
            const tradeType = isSeller ? 'sold' : 'bought';
            const source = String(t.source || 'listing').toLowerCase();
            const fulfilledAt = parseInt(t.fulfilledAt || Date.now(), 10);
            const fulfilledDate = new Date(fulfilledAt).toISOString().slice(0, 19).replace('T', ' ');

            const insertSql = `
              INSERT INTO user_trades 
              (id, farm_id, item_id, item_name, quantity, sfl, tax, net_sfl, unit_price, trade_type, source, counterparty_id, counterparty_name, fulfilled_at, fulfilled_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE 
                item_name = VALUES(item_name),
                quantity = VALUES(quantity),
                sfl = VALUES(sfl),
                tax = VALUES(tax),
                net_sfl = VALUES(net_sfl),
                unit_price = VALUES(unit_price)
            `;

            await pool.query(insertSql, [
              id, farmId, itemId, itemName, quantity, sfl, tax, netSfl, unitPrice, tradeType, source, otherId, otherName, fulfilledAt, fulfilledDate
            ]);
          }
        }
        console.log(`✅ [Auto-Sync Trades] Farm #${farmId}: Synced ${rawTrades.length} trades.`);
        totalSynced += rawTrades.length;
      } else {
        console.log(`ℹ️ [Auto-Sync Trades] Farm #${farmId}: 0 trades found.`);
      }
    } catch (err) {
      console.warn(`⚠️ [Auto-Sync Trades] Error syncing Farm #${farmId}: ${err.message}`);
    }

    // Strict 13-second gap between farms to comply with SFL rate limits
    if (i < farmEntries.length - 1) {
      console.log(`⏳ Waiting 13s before next farm (rate limit safe)...`);
      await delay(13000);
    }
  }

  console.log(`🎉 [Auto-Sync Trades] Finished auto-sync batch for ${farmEntries.length} farms. Total trades: ${totalSynced}.`);
}

module.exports = {
  fetchMarketplaceTradesWithRetry,
  processAutoSyncTrades
};
