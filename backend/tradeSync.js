const axios = require('axios');
const { getSflHeaders, queueFarmSync, delay } = require('./farmApi');
const { getTiDBPool, recordExchangeRateInCloud } = require('./db');
const { getItemNameById } = require('./knownIds');

async function fetchMarketplaceTradesRaw(farmId, apiKey = '', maxRetries = 3) {
  const totalAttempts = 1 + maxRetries; // 1 initial attempt + 3 retries = 4 attempts total
  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
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
      if (attempt <= maxRetries) {
        const timeStr = new Date().toISOString().substring(11, 19);
        console.warn(`[${timeStr} UTC] ⚠️ [Farm #${farmId}] Trade fetch failed (${err.message}). Sleeping 11s before retry ${attempt}/${maxRetries}...`);
        await delay(11000);
        console.log(`[${new Date().toISOString().substring(11, 19)} UTC] 🔄 [Farm #${farmId}] Finished waiting 11s. Retrying attempt ${attempt + 1}/${totalAttempts} now...`);
      } else {
        const timeStr = new Date().toISOString().substring(11, 19);
        console.error(`[${timeStr} UTC] ❌ [Farm #${farmId}] Trade fetch failed after ${maxRetries} retries: ${err.message}`);
        throw err;
      }
    }
  }
  return [];
}

async function fetchMarketplaceTradesWithRetry(farmId, apiKey = '', maxRetries = 3) {
  return queueFarmSync(() => fetchMarketplaceTradesRaw(farmId, apiKey, maxRetries));
}

async function processAutoSyncTrades(supabase) {
  console.log("🚀 [Auto-Sync Trades] Starting 5x daily marketplace trades auto-sync (11s gap, 3 retries)...");
  
  const farmMap = new Map();

  // Fetch registered users strictly from Supabase profiles
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

  const farmEntries = Array.from(farmMap.entries());
  console.log(`📋 [Auto-Sync Trades] Found ${farmEntries.length} registered profile farms to sync.`);


  // Fetch live exchange rate to lock in current USD price for newly synced trades
  let currentSflUsd = null;
  try {
    const exRes = await axios.get('https://sfl.world/api/v1.1/exchange', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    if (exRes.data?.sfl?.usd) {
      currentSflUsd = parseFloat(exRes.data.sfl.usd);
      const pool = getTiDBPool();
      if (pool) {
        await recordExchangeRateInCloud(pool, exRes.data);
      }
    }
  } catch (exErr) {
    console.warn("Notice: Auto-sync exchange rate fetch:", exErr.message);
  }

  let totalSynced = 0;

  for (let i = 0; i < farmEntries.length; i++) {
    const [farmId, apiKey] = farmEntries[i];
    console.log(`[${i + 1}/${farmEntries.length}] ⏳ Fetching trades for Farm #${farmId} (3 retries, 10s gap)...`);

    try {
      const rawTrades = await fetchMarketplaceTradesWithRetry(farmId, apiKey, 3);
      if (rawTrades.length > 0) {
        const pool = getTiDBPool();
        if (pool) {
          for (const t of rawTrades) {
            const id = String(t.id || '').trim();
            if (!id) continue;

            const myFarmIdStr = String(farmId).trim();
            const initId = String(t.initiatedBy?.id || '').trim();
            const fulfId = String(t.fulfilledBy?.id || '').trim();

            // In an offer:
            // initiatedBy = BUYER (who offered SFL to purchase)
            // fulfilledBy = SELLER (who accepted the offer and sold the item)
            // In a listing (or default):
            // initiatedBy = SELLER (who created the listing to sell)
            // fulfilledBy = BUYER (who purchased the listing)
            const sellerId = String(t.seller?.id || t.seller || '').trim();
            const buyerId = String(t.buyer?.id || t.buyer || '').trim();
            const isOffer = String(t.source || t.type || t.collection || '').toLowerCase().includes('offer');

            let isSeller = false;
            if (sellerId && sellerId === myFarmIdStr) {
              isSeller = true;
            } else if (buyerId && buyerId === myFarmIdStr) {
              isSeller = false;
            } else if (initId || fulfId) {
              isSeller = isOffer ? (fulfId === myFarmIdStr) : (initId === myFarmIdStr);
            }

            // Counterparty is ALWAYS the other party (the party whose ID does NOT match myFarmId)
            const otherParty = (initId === myFarmIdStr) ? t.fulfilledBy : t.initiatedBy;
            const otherName = otherParty?.username || (otherParty?.id ? `Farm #${otherParty.id}` : '');
            const otherId = otherParty?.id || (isSeller ? buyerId : sellerId) || null;

            const itemId = parseInt(t.itemId || 0, 10);
            const collection = String(t.collection || 'collectibles').toLowerCase().includes('wearable') ? 'wearables' : (String(t.collection || '').toLowerCase().includes('bud') ? 'buds' : 'collectibles');
            const isEconomy = t.collection === 'economies' || Boolean(t.economy);
            const resolvedName = (t.itemName && !t.itemName.startsWith('Item #'))
              ? t.itemName
              : (t.name && !t.name.startsWith('Item #') ? t.name : getItemNameById(itemId || t.itemId, collection));
            const itemName = isEconomy ? `#${itemId}` : String(resolvedName || `Item #${itemId}`).substring(0, 128);
            const quantity = parseFloat(t.quantity || 1);
            const sfl = parseFloat(t.sfl || 0);
            const tax = isSeller ? (parseFloat(t.tax || 0) || Math.round((sfl * 0.10) * 10000) / 10000) : 0;
            const netSfl = isSeller ? Math.max(0, sfl - tax) : sfl;
            const unitPrice = quantity > 0 ? (sfl / quantity) : sfl;
            const tradeType = isSeller ? 'sold' : 'bought';
            const source = String(t.source || 'listing').toLowerCase();
            const fulfilledAt = parseInt(t.fulfilledAt || Date.now(), 10);
            const fulfilledDate = new Date(fulfilledAt).toISOString().slice(0, 19).replace('T', ' ');

            const sflUsd = currentSflUsd || null;
            const tradeSfl = isSeller ? netSfl : sfl;
            const usdValue = sflUsd ? Math.round((tradeSfl * sflUsd) * 10000) / 10000 : null;

            const insertSql = `
              INSERT INTO user_trades 
              (id, farm_id, item_id, item_name, collection, quantity, sfl, tax, net_sfl, sfl_usd, usd_value, unit_price, trade_type, source, counterparty_id, counterparty_name, fulfilled_at, fulfilled_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE 
                item_name = VALUES(item_name),
                collection = VALUES(collection),
                quantity = VALUES(quantity),
                sfl = VALUES(sfl),
                tax = VALUES(tax),
                net_sfl = VALUES(net_sfl),
                sfl_usd = COALESCE(user_trades.sfl_usd, VALUES(sfl_usd)),
                usd_value = COALESCE(user_trades.usd_value, VALUES(usd_value)),
                unit_price = VALUES(unit_price),
                trade_type = VALUES(trade_type),
                source = VALUES(source),
                counterparty_id = VALUES(counterparty_id),
                counterparty_name = VALUES(counterparty_name)
            `;

            await pool.query(insertSql, [
              id, farmId, itemId, itemName, collection, quantity, sfl, tax, netSfl, sflUsd, usdValue, unitPrice, tradeType, source, otherId, otherName, fulfilledAt, fulfilledDate
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
  }

  console.log(`🎉 [Auto-Sync Trades] Finished auto-sync batch for ${farmEntries.length} farms. Total trades: ${totalSynced}.`);
}

async function getTodayTradesForFarm(farmId, todayDate) {
  const cleanFarmId = String(farmId).trim();
  const dayStartMs = new Date(todayDate + 'T00:00:00Z').getTime();
  const dayEndMs = new Date(todayDate + 'T22:30:00Z').getTime();

  let trades = [];

  // 1. Try TiDB Pool first if configured
  try {
    const pool = getTiDBPool();
    if (pool) {
      const [rows] = await pool.query(
        `SELECT item_name, quantity, trade_type, fulfilled_at 
         FROM user_trades 
         WHERE farm_id = ? AND fulfilled_at >= ? AND fulfilled_at <= ?`,
        [cleanFarmId, dayStartMs, dayEndMs]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        trades = rows.map(r => ({
          itemName: r.item_name,
          quantity: parseFloat(r.quantity || 1),
          tradeType: r.trade_type
        }));
      }
    }
  } catch (err) {
    console.warn(`Notice: TiDB query for trades Farm #${cleanFarmId}:`, err.message);
  }

  // 2. Fallback to direct API if TiDB had no trades or is not connected
  if (trades.length === 0) {
    try {
      const rawTrades = await fetchMarketplaceTradesWithRetry(cleanFarmId, '', 3);
      if (Array.isArray(rawTrades)) {
        for (const t of rawTrades) {
          const fulfilledAt = parseInt(t.fulfilledAt || 0, 10);
          if (fulfilledAt >= dayStartMs && fulfilledAt <= dayEndMs) {
            const myFarmIdStr = String(cleanFarmId).trim();
            const initId = String(t.initiatedBy?.id || '').trim();
            const fulfId = String(t.fulfilledBy?.id || '').trim();
            const sellerId = String(t.seller?.id || t.seller || '').trim();
            const buyerId = String(t.buyer?.id || t.buyer || '').trim();
            const isOffer = String(t.source || t.type || t.collection || '').toLowerCase().includes('offer');

            let isSeller = false;
            if (sellerId && sellerId === myFarmIdStr) {
              isSeller = true;
            } else if (buyerId && buyerId === myFarmIdStr) {
              isSeller = false;
            } else if (initId || fulfId) {
              isSeller = isOffer ? (fulfId === myFarmIdStr) : (initId === myFarmIdStr);
            }
            const tradeType = isSeller ? 'sold' : 'bought';
            const rawName = t.itemName || t.name;
            const itemId = parseInt(t.itemId || 0, 10);
            const itemName = (rawName && !rawName.startsWith('Item #'))
              ? rawName
              : getItemNameById(itemId || rawName);

            trades.push({
              itemName: itemName || `Item #${itemId}`,
              quantity: parseFloat(t.quantity || 1),
              tradeType: tradeType
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Notice: Marketplace trades fetch fallback Farm #${cleanFarmId}:`, err.message);
    }
  }

  const tradesBought = {};
  const tradesSold = {};

  trades.forEach(t => {
    const cleanK = String(t.itemName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (!cleanK) return;
    const qty = parseFloat(t.quantity || 0);
    if (t.tradeType === 'bought') {
      tradesBought[cleanK] = (tradesBought[cleanK] || 0) + qty;
    } else if (t.tradeType === 'sold') {
      tradesSold[cleanK] = (tradesSold[cleanK] || 0) + qty;
    }
  });

  return { tradesBought, tradesSold, rawTradesCount: trades.length };
}

module.exports = {
  fetchMarketplaceTradesWithRetry,
  fetchMarketplaceTradesRaw,
  processAutoSyncTrades,
  getTodayTradesForFarm
};
