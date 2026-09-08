import { renderTradeHistoryTemplate } from './tradeTemplate.js';
import { fetchMarketplaceTrades, getTradeAmounts, tradeHistoryData } from './tradeData.js';
import { switchSubTab, setTradeFilter, setItemFilter, selectedItemFilter, getUniqueTradedItems, currentView } from './tradeFilters.js';
import { exportTradesToCsv } from './tradeCsv.js';
import { renderCalendarMainView } from './tradeCalendar.js';
import { renderListingsView, renderOffersView } from './tradeListings.js';
import { renderTradesTableView } from './tradeTableView.js';
import { renderTradeSummaryMetrics } from './tradeMetrics.js';
import { renderItemAnalyticsView } from './tradeItemAnalytics.js';

export let searchQuery = '';

export function initTradeHistoryPanel() {
  renderTradeHistoryTemplate();

  document.getElementById('refresh-trade-history-btn')?.addEventListener('click', fetchMarketplaceTrades);
  document.getElementById('export-trades-csv-btn')?.addEventListener('click', exportTradesToCsv);

  document.getElementById('subtab-trades-btn')?.addEventListener('click', () => switchSubTab('trades'));
  document.getElementById('subtab-items-btn')?.addEventListener('click', () => switchSubTab('items'));
  document.getElementById('subtab-calendar-btn')?.addEventListener('click', () => switchSubTab('calendar'));
  document.getElementById('subtab-listings-btn')?.addEventListener('click', () => switchSubTab('listings'));
  document.getElementById('subtab-offers-btn')?.addEventListener('click', () => switchSubTab('offers'));

  document.getElementById('trade-filter-all')?.addEventListener('click', () => setTradeFilter('all'));
  document.getElementById('trade-filter-sold')?.addEventListener('click', () => setTradeFilter('sold'));
  document.getElementById('trade-filter-bought')?.addEventListener('click', () => setTradeFilter('bought'));

  const itemFilterEl = document.getElementById('trade-item-filter');
  itemFilterEl?.addEventListener('change', (e) => {
    setItemFilter(e.target.value);
  });

  const clearItemBtn = document.getElementById('trade-item-clear-btn');
  clearItemBtn?.addEventListener('click', () => {
    setItemFilter('all');
  });

  document.getElementById('tax-select')?.addEventListener('change', () => {
    if (tradeHistoryData) {
      renderTradeSummaryMetrics(tradeHistoryData);
      renderCurrentView();
    }
  });

  const searchEl = document.getElementById('trade-search-input');
  searchEl?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderCurrentView();
  });
}

export function populateItemFilterDropdown() {
  const trades = tradeHistoryData?.trades || [];
  const uniqueItems = getUniqueTradedItems(trades);

  const itemsCountEl = document.getElementById('subtab-items-count');
  if (itemsCountEl) {
    itemsCountEl.textContent = uniqueItems.length;
  }

  const selectEl = document.getElementById('trade-item-filter');
  if (selectEl) {
    const currentVal = selectedItemFilter || 'all';
    let html = `<option value="all">📦 All Items (${trades.length})</option>`;
    uniqueItems.forEach(item => {
      const isSel = (item.name.toLowerCase() === currentVal.toLowerCase());
      html += `<option value="${item.name}" ${isSel ? 'selected' : ''}>${item.name} (${item.count})</option>`;
    });
    selectEl.innerHTML = html;
    selectEl.value = currentVal;
  }

  const clearBtn = document.getElementById('trade-item-clear-btn');
  if (clearBtn) {
    if (selectedItemFilter && selectedItemFilter !== 'all') clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }
}

export function renderCurrentView() {
  const mountEl = document.getElementById('trade-content-mount');
  const titleEl = document.getElementById('trade-table-title');
  if (!mountEl || !tradeHistoryData) return;

  const farmId = String(tradeHistoryData.id || localStorage.getItem('sfl_farm_id') || '').trim();

  if (currentView === 'trades') {
    if (titleEl) titleEl.textContent = "📜 Completed Trade Ledger (Archived in TiDB Cloud)";
    renderTradesTableView(mountEl, farmId);
  } else if (currentView === 'items') {
    if (titleEl) titleEl.textContent = "📦 Individual Item Sales & Multi-Item Comparison";
    renderItemAnalyticsView(mountEl, farmId);
  } else if (currentView === 'calendar') {
    if (titleEl) titleEl.textContent = "📅 Trade Calendar & Profit Trends";
    renderCalendarMainView(mountEl, farmId);
  } else if (currentView === 'listings') {
    if (titleEl) titleEl.textContent = "🏷️ Active Marketplace Listings";
    renderListingsView(mountEl);
  } else if (currentView === 'offers') {
    if (titleEl) titleEl.textContent = "🎯 Open Buy Offers";
    renderOffersView(mountEl);
  }
}

window.switchSubTab = switchSubTab;
window.setTradeFilter = setTradeFilter;
window.setItemFilter = setItemFilter;
window.exportTradesToCsv = exportTradesToCsv;

export { fetchMarketplaceTrades, getTradeAmounts, renderTradeHistoryTemplate, setItemFilter };


