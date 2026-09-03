import { renderTradeHistoryTemplate } from './tradeTemplate.js';
import { fetchMarketplaceTrades, getTradeAmounts, tradeHistoryData } from './tradeData.js';
import { switchSubTab, setTradeFilter, currentView } from './tradeFilters.js';
import { exportTradesToCsv } from './tradeCsv.js';
import { renderCalendarMainView } from './tradeCalendar.js';
import { renderListingsView, renderOffersView } from './tradeListings.js';
import { renderTradesTableView } from './tradeTableView.js';

export let searchQuery = '';

export function initTradeHistoryPanel() {
  renderTradeHistoryTemplate();

  document.getElementById('refresh-trade-history-btn')?.addEventListener('click', fetchMarketplaceTrades);
  document.getElementById('export-trades-csv-btn')?.addEventListener('click', exportTradesToCsv);

  document.getElementById('subtab-trades-btn')?.addEventListener('click', () => switchSubTab('trades'));
  document.getElementById('subtab-calendar-btn')?.addEventListener('click', () => switchSubTab('calendar'));
  document.getElementById('subtab-listings-btn')?.addEventListener('click', () => switchSubTab('listings'));
  document.getElementById('subtab-offers-btn')?.addEventListener('click', () => switchSubTab('offers'));

  document.getElementById('trade-filter-all')?.addEventListener('click', () => setTradeFilter('all'));
  document.getElementById('trade-filter-sold')?.addEventListener('click', () => setTradeFilter('sold'));
  document.getElementById('trade-filter-bought')?.addEventListener('click', () => setTradeFilter('bought'));

  const searchEl = document.getElementById('trade-search-input');
  searchEl?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderCurrentView();
  });
}

export function renderCurrentView() {
  const mountEl = document.getElementById('trade-content-mount');
  const titleEl = document.getElementById('trade-table-title');
  if (!mountEl || !tradeHistoryData) return;

  const farmId = String(tradeHistoryData.id || localStorage.getItem('sfl_farm_id') || '').trim();

  if (currentView === 'trades') {
    if (titleEl) titleEl.textContent = "📜 Completed Trade Ledger (Archived in TiDB Cloud)";
    renderTradesTableView(mountEl, farmId);
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
window.exportTradesToCsv = exportTradesToCsv;

export { fetchMarketplaceTrades, getTradeAmounts, renderTradeHistoryTemplate };

