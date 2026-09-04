import { getItemNameById } from '../../data/knownIds.js';
import { ApiService } from '../../services/api.js';
import { renderTradeSummaryMetrics } from './tradeMetrics.js';
import { renderCurrentView } from './index.js';

export let tradeHistoryData = null;
export let cloudArchivedCount = 0;

export async function fetchMarketplaceTrades() {
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
  const apiKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value.trim() || '';
  const statusEl = document.getElementById('trade-history-status');
  const mountEl = document.getElementById('trade-content-mount');

  if (!farmId) {
    alert("⚠️ Please enter your Farm ID at the top first!");
    return;
  }

  if (statusEl) statusEl.textContent = "⏳ Syncing marketplace & TiDB Cloud...";

  try {
    const data = await ApiService.getMarketplaceProfile(farmId, apiKey);
    tradeHistoryData = data;

    // Format trades for TiDB Cloud archiving
    const rawTrades = data.trades || [];
    const formattedForCloud = rawTrades.map(t => {
      const isSeller = isUserSeller(t, farmId);
      const rawName = t.itemName;
      const itemName = (rawName && !rawName.startsWith('Item #')) ? rawName : getItemNameById(t.itemId || rawName);
      const otherUser = isSeller ? (t.fulfilledBy?.username || '') : (t.initiatedBy?.username || '');
      const otherId = isSeller ? (t.fulfilledBy?.id || null) : (t.initiatedBy?.id || null);

      return {
        id: t.id,
        farmId: farmId,
        itemId: t.itemId,
        itemName: itemName,
        quantity: parseFloat(t.quantity || 1),
        sfl: parseFloat(t.sfl || 0),
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
      const cloudRes = await ApiService.getCloudTrades(farmId);
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

    renderTradeSummaryMetrics(tradeHistoryData);
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
    // Subtract the exact tax that the API returns (trade.tax)
    const tax = parseFloat(trade.tax || 0);
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
  if (trade.tradeType) return trade.tradeType === 'sold';
  const initId = String(trade.initiatedBy?.id || trade.seller || '');
  const fulfId = String(trade.fulfilledBy?.id || trade.buyer || '');

  if (trade.source === 'listing') {
    return initId === myFarmId;
  } else if (trade.source === 'offer') {
    return fulfId === myFarmId;
  }
  return initId === myFarmId;
}
