import { getItemNameById } from '../../data/knownIds.js';
import { ApiService } from '../../services/api.js';
import { renderTradeSummaryMetrics } from './tradeMetrics.js';
import { renderCurrentView, populateItemFilterDropdown } from './index.js';
import { getItemTaxRate, isGlobalTaxItem } from '../../config/constants.js';

export let tradeHistoryData = null;
export let cloudArchivedCount = 0;
export let lastTradeFetchTime = 0;

export async function fetchMarketplaceTrades(force = false) {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value.trim() || '';
  const statusEl = document.getElementById('trade-history-status');
  const mountEl = document.getElementById('trade-content-mount');

  if (!farmId) {
    alert("⚠️ Please enter your Farm ID at the top first!");
    return { success: false, error: 'Farm ID required' };
  }

  // Fast path: Reuse in-memory trades if fetched in the last 3 minutes and not forced
  if (!force && tradeHistoryData && (Date.now() - lastTradeFetchTime < 180000)) {
    populateItemFilterDropdown();
    renderTradeSummaryMetrics(tradeHistoryData, window.farmData);
    renderCurrentView();
    if (statusEl) statusEl.textContent = `✅ Synced & Archived (${cloudArchivedCount || tradeHistoryData.trades?.length || 0} Total)`;
    return { success: true, count: cloudArchivedCount || tradeHistoryData.trades?.length || 0, fromCache: true };
  }

  if (statusEl) statusEl.textContent = "⏳ Syncing marketplace & TiDB Cloud...";

  try {
    const [data, farmObj] = await Promise.all([
      ApiService.getMarketplaceProfile(farmId, apiKey, { force }),
      ApiService.getFarmFullData(farmId, apiKey, { force }).catch(err => {
        console.warn("Farm transfer data fetch note:", err.message);
        return window.farmData || null;
      })
    ]);
    tradeHistoryData = data;
    if (farmObj) window.farmData = farmObj;
    lastTradeFetchTime = Date.now();

    // Format trades for TiDB Cloud archiving
    const rawTrades = data.trades || [];
    const myFarmIdStr = String(farmId).trim();
    const formattedForCloud = rawTrades.map(t => {
      const isSeller = isUserSeller(t, myFarmIdStr);
      const rawName = t.itemName;
      const itemName = (rawName && !rawName.startsWith('Item #')) ? rawName : getItemNameById(t.itemId || rawName);
      
      const initId = String(t.initiatedBy?.id || '').trim();
      const otherParty = (initId === myFarmIdStr) ? t.fulfilledBy : t.initiatedBy;
      const otherUser = otherParty?.username || (otherParty?.id ? `Farm #${otherParty.id}` : '');
      const otherId = otherParty?.id || null;
      const amounts = getTradeAmounts(t, myFarmIdStr);

      return {
        id: t.id,
        farmId: myFarmIdStr,
        itemId: t.itemId,
        itemName: itemName,
        quantity: parseFloat(t.quantity || 1),
        sfl: parseFloat(t.sfl || 0),
        tax: amounts.tax,
        netSfl: amounts.netSfl,
        tradeType: isSeller ? 'sold' : 'bought',
        source: t.source || 'listing',
        counterpartyId: otherId,
        counterpartyName: otherUser,
        fulfilledAt: t.fulfilledAt
      };
    });

    // 1. Sync live batch to TiDB Cloud
    try {
      const syncRes = await ApiService.syncTradesToCloud(farmId, formattedForCloud);
      if (syncRes?.totalArchivedTrades) {
        cloudArchivedCount = syncRes.totalArchivedTrades;
      }
    } catch (err) {
      console.warn("TiDB Cloud batch sync note:", err.message);
    }

    // 2. Fetch accumulated lifetime trades from TiDB Cloud
    try {
      const cloudRes = await ApiService.getCloudTrades(farmId, { force });
      if (cloudRes?.trades && Array.isArray(cloudRes.trades) && cloudRes.trades.length > 0) {
        // Merge cloud historical trades with live trades
        const tradesMap = new Map();
        cloudRes.trades.forEach(t => {
          if (!t.itemName || t.itemName.startsWith('Item #')) {
            t.itemName = getItemNameById(t.itemId || t.itemName);
          }
          tradesMap.set(t.id, t);
        });
        formattedForCloud.forEach(t => {
          if (!t.itemName || t.itemName.startsWith('Item #')) {
            t.itemName = getItemNameById(t.itemId || t.itemName);
          }
          tradesMap.set(t.id, t);
        });

        tradeHistoryData.trades = Array.from(tradesMap.values()).sort((a, b) => (b.fulfilledAt || 0) - (a.fulfilledAt || 0));
        cloudArchivedCount = tradeHistoryData.trades.length;
      }
    } catch (err) {
      console.warn("TiDB Cloud fetch note:", err.message);
    }

    populateItemFilterDropdown();
    renderTradeSummaryMetrics(tradeHistoryData, farmObj || window.farmData);
    renderCurrentView();
    if (statusEl) statusEl.textContent = `✅ Synced & Archived (${cloudArchivedCount || tradeHistoryData.trades?.length || 0} Total)`;
    return { success: true, count: cloudArchivedCount || tradeHistoryData.trades?.length || 0 };
  } catch (err) {
    const isAuthErr = err.message.includes('401') || err.message.toLowerCase().includes('api key');
    if (statusEl) statusEl.textContent = isAuthErr ? "⚠️ VIP Key Required" : `❌ Error: ${err.message}`;

    if (mountEl) {
      if (isAuthErr) {
        mountEl.innerHTML = `
          <div class="p-8 text-center text-sfl-dirt">
            <div class="max-w-md mx-auto bg-amber-50 border-2 border-amber-400 p-5 rounded-xl shadow-sm space-y-3">
              <div class="inline-block px-3 py-1 bg-amber-200 border border-amber-500 rounded-lg text-amber-950 font-bold text-xs">
                🔑 VIP Community API Key Required
              </div>
              <p class="text-xs text-sfl-wood font-medium leading-relaxed">
                Marketplace trading profile is powered by Sunflower Land's VIP Community API (Level 50+ VIP bumpkins).
              </p>
              <p class="text-[11px] text-sfl-woodLight">
                Please paste your API Key in the top header <strong>"API Key (Optional)"</strong> field to view live trades.
              </p>
              <a href="https://sunflower-land.com/community-docs" target="_blank" rel="noopener noreferrer" 
                class="inline-block text-xs font-bold text-amber-700 underline hover:text-amber-900">
                📖 How to get your SFL API Key ↗
              </a>
            </div>
          </div>
        `;
      } else {
        mountEl.innerHTML = `<div class="p-8 text-center text-sfl-accent italic font-semibold">❌ ${err.message}</div>`;
      }
    }
    return { success: false, error: err.message };
  }
}

export function getTradeAmounts(trade, farmId) {
  const isSeller = isUserSeller(trade, farmId);
  const grossSfl = parseFloat(trade.sfl || 0);

  if (isSeller) {
    let rawName = trade.itemName || trade.name || trade.item || '';
    if (!rawName || rawName.startsWith('Item #')) {
      rawName = getItemNameById(trade.itemId || trade.item_id || '') || rawName;
    }
    const savedTax = typeof localStorage !== 'undefined' ? localStorage.getItem('sfl_tax_rate') : null;
    const taxSelectEl = typeof document !== 'undefined' ? document.getElementById('tax-select') : null;
    const globalTaxRate = taxSelectEl ? (parseFloat(taxSelectEl.value) || 0) : (savedTax !== null ? parseFloat(savedTax) : 0.10);
    const effectiveTaxRate = getItemTaxRate(rawName, globalTaxRate);
    const tax = Math.round((grossSfl * effectiveTaxRate) * 10000) / 10000;
    const netSfl = Math.max(0, grossSfl - tax);
    return {
      isSeller: true,
      grossSfl,
      tax,
      netSfl,
      amount: netSfl
    };
  } else {
    // Buyer pays 100% of price
    return {
      isSeller: false,
      grossSfl,
      tax: 0,
      netSfl: grossSfl,
      amount: grossSfl
    };
  }
}

export function isUserSeller(trade, myFarmId) {
  const myIdStr = String(myFarmId || '').trim();
  const initId = String(trade.initiatedBy?.id || trade.seller || '').trim();
  const fulfId = String(trade.fulfilledBy?.id || trade.buyer || '').trim();

  // If trade has initiator or fulfiller data (definitive truth from SFL API)
  if (initId || fulfId) {
    if (trade.source === 'offer') {
      // In an offer:
      // initiatedBy = BUYER (who created offer to buy)
      // fulfilledBy = SELLER (who accepted offer to sell)
      return fulfId === myIdStr;
    }
    // In a listing (or default):
    // initiatedBy = SELLER (who listed the item for sale)
    // fulfilledBy = BUYER (who bought the listing)
    return initId === myIdStr;
  }

  // Fallback to database tradeType / trade_type if initiator/fulfiller are omitted
  if (trade.tradeType) return trade.tradeType.toLowerCase() === 'sold';
  if (trade.trade_type) return trade.trade_type.toLowerCase() === 'sold';
  return false;
}

export function getTradeCounterparty(trade, farmId, isSeller) {
  const myIdStr = String(farmId || '').trim();
  const initId = String(trade.initiatedBy?.id || '').trim();
  const fulfId = String(trade.fulfilledBy?.id || '').trim();

  // If live initiator / fulfiller objects are present, pick the other party
  if (initId && initId === myIdStr && trade.fulfilledBy) {
    return trade.fulfilledBy.username || (trade.fulfilledBy.id ? `Farm #${trade.fulfilledBy.id}` : (isSeller ? 'Market Buyer' : 'Market Seller'));
  }
  if (fulfId && fulfId === myIdStr && trade.initiatedBy) {
    return trade.initiatedBy.username || (trade.initiatedBy.id ? `Farm #${trade.initiatedBy.id}` : (isSeller ? 'Market Buyer' : 'Market Seller'));
  }

  const cpName = trade.counterpartyName || trade.counterparty_name;
  const cpId = trade.counterpartyId || trade.counterparty_id;

  if (cpName && String(cpId) !== myIdStr && cpName !== 'Kuro1') {
    return cpName;
  }
  if (cpId && String(cpId) !== myIdStr) {
    return `Farm #${cpId}`;
  }

  return isSeller ? 'Market Buyer' : 'Market Seller';
}
