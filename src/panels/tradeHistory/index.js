import { renderTradeHistoryTemplate } from './tradeTemplate.js';
import { fetchMarketplaceTrades, getTradeAmounts, tradeHistoryData } from './tradeData.js';
import {
  switchSubTab,
  setTradeFilter,
  setItemFilter,
  selectedItemFilter,
  getUniqueTradedItems,
  currentView,
  setResourceNftFilter,
  filterResources,
  filterNfts
} from './tradeFilters.js';
import { exportTradesToCsv } from './tradeCsv.js';
import { renderCalendarMainView } from './tradeCalendar.js';
import { renderListingsView, renderOffersView } from './tradeListings.js';
import { renderTradesTableView } from './tradeTableView.js';
import {
  renderTradeSummaryMetrics,
  stepDayOffset,
  stepWeekOffset,
  stepMonthOffset,
  resetPeriodOffsets
} from './tradeMetrics.js';
import { renderItemAnalyticsView } from './tradeItemAnalytics.js';

export let searchQuery = '';

export function initTradeHistoryPanel() {
  renderTradeHistoryTemplate();

  document.getElementById('refresh-trade-history-btn')?.addEventListener('click', () => fetchMarketplaceTrades(true));
  document.getElementById('export-trades-csv-btn')?.addEventListener('click', exportTradesToCsv);

  document.getElementById('subtab-trades-btn')?.addEventListener('click', () => switchSubTab('trades'));
  document.getElementById('subtab-items-btn')?.addEventListener('click', () => switchSubTab('items'));
  document.getElementById('subtab-calendar-btn')?.addEventListener('click', () => switchSubTab('calendar'));
  document.getElementById('subtab-listings-btn')?.addEventListener('click', () => switchSubTab('listings'));
  document.getElementById('subtab-offers-btn')?.addEventListener('click', () => switchSubTab('offers'));

  document.getElementById('trade-filter-all')?.addEventListener('click', () => setTradeFilter('all'));
  document.getElementById('trade-filter-sold')?.addEventListener('click', () => setTradeFilter('sold'));
  document.getElementById('trade-filter-bought')?.addEventListener('click', () => setTradeFilter('bought'));

  // Day / Week / Month arrow navigation
  document.getElementById('day-nav-prev')?.addEventListener('click', () => stepDayOffset(-1));
  document.getElementById('day-nav-next')?.addEventListener('click', () => stepDayOffset(1));
  document.getElementById('week-nav-prev')?.addEventListener('click', () => stepWeekOffset(-1));
  document.getElementById('week-nav-next')?.addEventListener('click', () => stepWeekOffset(1));
  document.getElementById('month-nav-prev')?.addEventListener('click', () => stepMonthOffset(-1));
  document.getElementById('month-nav-next')?.addEventListener('click', () => stepMonthOffset(1));
  document.getElementById('trade-reset-periods-btn')?.addEventListener('click', () => resetPeriodOffsets());

  // 64 Resources & NFT tick filter checkboxes
  const resCheckbox = document.getElementById('trade-filter-resources');
  const nftsCheckbox = document.getElementById('trade-filter-nfts');
  const onFilterChange = (changedType) => {
    const resVal = resCheckbox?.checked;
    const nftsVal = nftsCheckbox?.checked;
    if (!resVal && !nftsVal) {
      if (changedType === 'resources' && resCheckbox) resCheckbox.checked = true;
      if (changedType === 'nfts' && nftsCheckbox) nftsCheckbox.checked = true;
      return;
    }
    setResourceNftFilter(Boolean(resCheckbox?.checked), Boolean(nftsCheckbox?.checked));
    if (tradeHistoryData) {
      renderTradeSummaryMetrics(tradeHistoryData, window.farmData);
      populateItemFilterDropdown();
      renderCurrentView();
    }
  };
  resCheckbox?.addEventListener('change', () => onFilterChange('resources'));
  nftsCheckbox?.addEventListener('change', () => onFilterChange('nfts'));

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
      renderTradeSummaryMetrics(tradeHistoryData, window.farmData);
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
    let html = `<option value="all">📦 All Items (${uniqueItems.reduce((sum, i) => sum + i.count, 0)})</option>`;
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
window.stepDayOffset = stepDayOffset;
window.stepWeekOffset = stepWeekOffset;
window.stepMonthOffset = stepMonthOffset;
window.resetPeriodOffsets = resetPeriodOffsets;

export { fetchMarketplaceTrades, getTradeAmounts, renderTradeHistoryTemplate, setItemFilter };
