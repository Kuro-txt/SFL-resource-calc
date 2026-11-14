import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { getItemIcon } from '../../utils/itemIcons.js';
import { RESOURCE_CATEGORY_BADGES } from './inventoryLogic.js';

/**
 * Returns main shell template HTML for the Inventory panel.
 */
export function renderInventoryShell() {
  return `
    <div class="space-y-4">
      <!-- 1. Header with Title & Action Controls -->
      <div class="sfl-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-sfl-cardBorder">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h2 class="text-lg sm:text-xl font-bold text-sfl-wood dark:text-amber-100 flex items-center gap-2">
              <span>🎒</span> Farm Inventory
            </h2>
            <span id="inventory-farm-badge" class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/60 dark:bg-slate-700 text-sfl-wood dark:text-amber-200 border border-amber-300 dark:border-slate-600">
              Farm: Not Synced
            </span>
          </div>
          <p class="text-[11px] sm:text-xs text-sfl-woodLight dark:text-slate-400">
            Live on-farm valuation of your resources and boosted items with real-time floor pricing and net liquidation totals.
          </p>
        </div>

        <!-- Sync Button & Last Updated Time -->
        <div class="flex items-center gap-2 shrink-0">
          <span id="inventory-sync-time" class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-mono hidden sm:inline-block">
            Not synced
          </span>
          <button id="inventory-refresh-btn" type="button" class="sfl-button-secondary px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer">
            <svg id="inventory-refresh-spinner" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Sync Inventory</span>
          </button>
        </div>
      </div>

      <!-- 2. Dual Sub-Tabs Toggle (Resources vs Boosts) -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-amber-100/50 dark:bg-slate-800/60 p-1.5 sm:p-2 rounded-2xl border border-sfl-cardBorder">
        <div class="flex items-center gap-1.5 sm:gap-2">
          <button id="inv-subtab-resources-btn" type="button" class="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border-2 transition flex items-center gap-2 cursor-pointer bg-sfl-wood text-amber-200 border-sfl-dirt shadow-md">
            <span>🌾</span> Resources
            <span id="inv-res-tab-count" class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200/30 text-amber-100">0</span>
          </button>
          <button id="inv-subtab-boosts-btn" type="button" class="px-4 py-2 rounded-xl font-bold text-xs sm:text-sm border-2 transition flex items-center gap-2 cursor-pointer bg-transparent text-sfl-woodLight dark:text-slate-300 border-transparent hover:bg-amber-200/50 dark:hover:bg-slate-700/50">
            <span>⚡</span> Boosts
            <span id="inv-boost-tab-count" class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200/30 text-sfl-woodLight dark:text-slate-400">0</span>
          </button>
        </div>

        <!-- Global Tax Notice Indicator -->
        <div id="inv-tax-notice" class="text-[11px] px-3 py-1 rounded-lg bg-amber-200/50 dark:bg-slate-700 text-sfl-wood dark:text-amber-200 font-medium flex items-center gap-1.5">
          <span>🏷️</span> <span id="inv-tax-notice-text">Using Global Tax</span>
        </div>
      </div>

      <!-- 3. Summary Stat Cards Container -->
      <div id="inv-summary-cards" class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <!-- Rendered dynamically -->
      </div>

      <!-- 4. Filter, Search & Controls Bar -->
      <div class="sfl-card p-3 sm:p-4 space-y-3 bg-white/70 dark:bg-slate-800/80 border border-sfl-cardBorder">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <!-- Search Bar -->
          <div class="relative flex-1">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">🔍</span>
            <input id="inv-search-input" type="text" placeholder="Search by name, category, or boost effect..." autocomplete="off" class="w-full sfl-input rounded-xl pl-8 pr-8 py-2 text-xs sm:text-sm text-sfl-dirt dark:text-amber-100 bg-white dark:bg-slate-900 border border-sfl-cardBorder focus:outline-none focus:ring-2 focus:ring-sfl-gold">
            <button id="inv-search-clear-btn" type="button" class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 hidden text-sm font-bold cursor-pointer">✕</button>
          </div>

          <!-- Controls: Hide Zero & Sort -->
          <div class="flex items-center gap-2.5 justify-between sm:justify-end">
            <!-- Hide 0 Stock Toggle -->
            <label class="flex items-center gap-1.5 text-xs text-sfl-wood dark:text-amber-200 font-bold select-none cursor-pointer">
              <input id="inv-hide-zero-cb" type="checkbox" checked class="rounded text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer">
              <span>Hide 0 Stock</span>
            </label>

            <!-- Sort By Dropdown -->
            <select id="inv-sort-select" class="sfl-input rounded-xl px-2.5 py-1.5 text-xs text-sfl-wood dark:text-amber-100 bg-white dark:bg-slate-900 border border-sfl-cardBorder focus:outline-none cursor-pointer">
              <option value="netValueDesc">Net Value (High → Low)</option>
              <option value="netValueAsc">Net Value (Low → High)</option>
              <option value="qtyDesc">Quantity (High → Low)</option>
              <option value="priceDesc">Floor Price (High → Low)</option>
              <option value="nameAsc">Name (A → Z)</option>
            </select>
          </div>
        </div>

        <!-- Category Filter Pills (Shown for Resources tab) -->
        <div id="inv-category-pills" class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-200/50 dark:border-slate-700/60">
          <button type="button" data-cat="all" class="inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-sfl-wood text-amber-200 border border-sfl-dirt">
            All
          </button>
          <button type="button" data-cat="Crops" class="inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/70 dark:bg-slate-700/60 text-sfl-woodLight dark:text-slate-300 hover:bg-amber-200">
            🌱 Crops
          </button>
          <button type="button" data-cat="Fruits" class="inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/70 dark:bg-slate-700/60 text-sfl-woodLight dark:text-slate-300 hover:bg-amber-200">
            🍎 Fruits
          </button>
          <button type="button" data-cat="Greenhouse" class="inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/70 dark:bg-slate-700/60 text-sfl-woodLight dark:text-slate-300 hover:bg-amber-200">
            🏡 Greenhouse
          </button>
          <button type="button" data-cat="Minerals" class="inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/70 dark:bg-slate-700/60 text-sfl-woodLight dark:text-slate-300 hover:bg-amber-200">
            ⛏️ Minerals
          </button>
          <button type="button" data-cat="Animal" class="inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/70 dark:bg-slate-700/60 text-sfl-woodLight dark:text-slate-300 hover:bg-amber-200">
            🐔 Animals
          </button>
          <button type="button" data-cat="Beetles" class="inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/70 dark:bg-slate-700/60 text-sfl-woodLight dark:text-slate-300 hover:bg-amber-200">
            🪲 Beetles
          </button>
          <button type="button" data-cat="Forage & Other" class="inv-cat-pill px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-100/70 dark:bg-slate-700/60 text-sfl-woodLight dark:text-slate-300 hover:bg-amber-200">
            🛡️ Other
          </button>
        </div>
      </div>

      <!-- 5. Active Items Data Table / Grid Container -->
      <div id="inv-table-mount" class="sfl-card p-0 overflow-hidden bg-white/90 dark:bg-slate-800/90 border border-sfl-cardBorder">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;
}

/**
 * Returns summary cards HTML based on current sub-tab data.
 */
export function renderSummaryCards({ subTab, summary, taxRate, globalTaxRate }) {
  const isResources = subTab === 'resources';
  const taxPercentText = isResources ? `${parseFloat((globalTaxRate * 100).toFixed(2))}% (Global)` : '10% (Fixed)';
  const taxBadgeColor = isResources ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';

  return `
    <!-- Card 1: Total Owned Assets -->
    <div class="sfl-card p-3 sm:p-4 bg-amber-50/80 dark:bg-slate-800 border border-amber-200 dark:border-slate-700">
      <div class="flex items-center justify-between">
        <span class="text-[10px] sm:text-xs font-bold text-sfl-woodLight dark:text-slate-400 uppercase tracking-wider">
          ${isResources ? 'Owned Resources' : 'Owned Boosts'}
        </span>
        <span class="text-base">${isResources ? '🌾' : '⚡'}</span>
      </div>
      <div class="mt-1 flex items-baseline gap-1.5">
        <span class="text-lg sm:text-2xl font-black text-sfl-wood dark:text-amber-100">
          ${summary.ownedCount.toLocaleString()}
        </span>
        <span class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-mono">
          (${summary.totalUnits.toLocaleString(undefined, { maximumFractionDigits: 1 })} units)
        </span>
      </div>
    </div>

    <!-- Card 2: Gross Valuation -->
    <div class="sfl-card p-3 sm:p-4 bg-amber-50/80 dark:bg-slate-800 border border-amber-200 dark:border-slate-700">
      <div class="flex items-center justify-between">
        <span class="text-[10px] sm:text-xs font-bold text-sfl-woodLight dark:text-slate-400 uppercase tracking-wider">
          Gross Valuation
        </span>
        <span class="text-base">📦</span>
      </div>
      <div class="mt-1">
        <div class="text-base sm:text-xl font-black text-sfl-wood dark:text-amber-100 flex items-center gap-1">
          <span>${summary.totalGrossFlowers.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</span>
          ${FLOWER_IMG_SMALL_HTML}
        </div>
        <div class="text-[10px] sm:text-[11px] text-sfl-woodLight dark:text-slate-400 font-mono">
          Before Tax
        </div>
      </div>
    </div>

    <!-- Card 3: Tax Deducted -->
    <div class="sfl-card p-3 sm:p-4 bg-amber-50/80 dark:bg-slate-800 border border-amber-200 dark:border-slate-700">
      <div class="flex items-center justify-between">
        <span class="text-[10px] sm:text-xs font-bold text-sfl-woodLight dark:text-slate-400 uppercase tracking-wider">
          Tax Deducted
        </span>
        <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${taxBadgeColor} border border-current">
          ${taxPercentText}
        </span>
      </div>
      <div class="mt-1">
        <div class="text-base sm:text-xl font-black text-red-600 dark:text-red-400 flex items-center gap-1">
          <span>-${summary.totalTaxFlowers.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</span>
          ${FLOWER_IMG_SMALL_HTML}
        </div>
        <div class="text-[10px] sm:text-[11px] text-sfl-woodLight dark:text-slate-400 font-mono">
          ${isResources ? 'Using header tax' : 'Fixed SFL trade tax'}
        </div>
      </div>
    </div>

    <!-- Card 4: Net Liquidation Value -->
    <div class="sfl-card p-3 sm:p-4 bg-gradient-to-br from-amber-500/20 via-amber-100/50 to-amber-500/10 dark:from-amber-950/40 dark:via-slate-800 dark:to-amber-900/30 border-2 border-sfl-gold shadow-md">
      <div class="flex items-center justify-between">
        <span class="text-[10px] sm:text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
          Net Liquidation
        </span>
        <span class="text-base">💰</span>
      </div>
      <div class="mt-1">
        <div class="text-base sm:text-xl font-black text-amber-900 dark:text-amber-300 flex items-center gap-1">
          <span>${summary.totalNetFlowers.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</span>
          ${FLOWER_IMG_SMALL_HTML}
        </div>
        <div class="text-[10px] sm:text-[11px] text-amber-800 dark:text-amber-400 font-mono font-bold">
          ≈ $${summary.totalNetUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </div>
      </div>
    </div>
  `;
}

/**
 * Returns table HTML for the Resources sub-tab.
 */
export function renderResourcesTable(rows, globalTaxRate) {
  if (!rows || rows.length === 0) {
    return `
      <div class="p-8 text-center space-y-2">
        <div class="text-3xl">🌾</div>
        <div class="text-sm font-bold text-sfl-wood dark:text-amber-100">No resources found matching filter</div>
        <p class="text-xs text-sfl-woodLight dark:text-slate-400">Try adjusting your search query or unchecking "Hide 0 Stock".</p>
      </div>
    `;
  }

  const tableRows = rows.map(row => {
    const iconHtml = getItemIcon(row.name, { className: 'w-6 h-6 object-contain shrink-0' });
    const badgeInfo = RESOURCE_CATEGORY_BADGES[row.category] || RESOURCE_CATEGORY_BADGES['Forage & Other'];
    const taxPercent = parseFloat((row.taxRate * 100).toFixed(2));

    return `
      <tr class="border-b border-amber-100 dark:border-slate-700/60 hover:bg-amber-50/60 dark:hover:bg-slate-700/40 transition">
        <!-- Item Name & Icon -->
        <td class="px-3 sm:px-4 py-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-amber-100/70 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-amber-200 dark:border-slate-600">
              ${iconHtml}
            </div>
            <div>
              <div class="font-bold text-xs sm:text-sm text-sfl-wood dark:text-amber-100">${row.name}</div>
              <span class="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeInfo.bg}">
                ${badgeInfo.label}
              </span>
            </div>
          </div>
        </td>

        <!-- Owned Stock Quantity -->
        <td class="px-3 sm:px-4 py-2.5 text-right">
          <div class="font-mono font-bold text-xs sm:text-sm ${row.qty > 0 ? 'text-sfl-wood dark:text-amber-100' : 'text-slate-400'}">
            ${row.qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </td>

        <!-- Unit Floor Price -->
        <td class="px-3 sm:px-4 py-2.5 text-right font-mono text-xs">
          <div class="flex items-center justify-end gap-1 font-bold text-sfl-wood dark:text-amber-100">
            <span>${row.unitPrice.toFixed(4)}</span>
            ${FLOWER_IMG_SMALL_HTML}
          </div>
        </td>

        <!-- Gross Value -->
        <td class="px-3 sm:px-4 py-2.5 text-right font-mono text-xs hidden md:table-cell">
          <div class="flex items-center justify-end gap-1 text-slate-600 dark:text-slate-300">
            <span>${row.grossValue.toFixed(3)}</span>
            ${FLOWER_IMG_SMALL_HTML}
          </div>
        </td>

        <!-- Tax Rate & Deduction -->
        <td class="px-3 sm:px-4 py-2.5 text-right font-mono text-xs hidden sm:table-cell">
          <div class="text-red-500 font-semibold">
            -${row.taxAmount.toFixed(3)}
          </div>
          <div class="text-[10px] text-slate-400">
            (${taxPercent}%)
          </div>
        </td>

        <!-- Net Value -->
        <td class="px-3 sm:px-4 py-2.5 text-right">
          <div class="flex items-center justify-end gap-1 font-mono font-black text-xs sm:text-sm text-amber-900 dark:text-amber-300">
            <span>${row.netValue.toFixed(3)}</span>
            ${FLOWER_IMG_SMALL_HTML}
          </div>
          <div class="text-[10px] font-mono text-slate-400 font-semibold">
            ≈ $${row.netUsd.toFixed(2)}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-amber-100/70 dark:bg-slate-700/80 text-[11px] font-bold text-sfl-woodLight dark:text-slate-300 uppercase tracking-wider border-b border-sfl-cardBorder">
            <th class="px-3 sm:px-4 py-2.5">Resource</th>
            <th class="px-3 sm:px-4 py-2.5 text-right">Stock</th>
            <th class="px-3 sm:px-4 py-2.5 text-right">Unit Price</th>
            <th class="px-3 sm:px-4 py-2.5 text-right hidden md:table-cell">Gross</th>
            <th class="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">Tax (${parseFloat((globalTaxRate * 100).toFixed(2))}%)</th>
            <th class="px-3 sm:px-4 py-2.5 text-right">Net Value</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Returns table HTML for the Boosts sub-tab.
 */
export function renderBoostsTable(rows) {
  if (!rows || rows.length === 0) {
    return `
      <div class="p-8 text-center space-y-2">
        <div class="text-3xl">⚡</div>
        <div class="text-sm font-bold text-sfl-wood dark:text-amber-100">No boosted items found matching filter</div>
        <p class="text-xs text-sfl-woodLight dark:text-slate-400">Try adjusting your search query or unchecking "Hide 0 Stock".</p>
      </div>
    `;
  }

  const tableRows = rows.map(row => {
    const isWearableItem = row.isWearable || row.wardrobeQty > 0 || (row.cleanKey === 'parsnip');
    const iconHtml = getItemIcon(row.name, {
      className: 'w-6 h-6 object-contain shrink-0',
      isBoost: true,
      isWearable: isWearableItem
    });
    const boostLines = row.boostDesc.split('\n').filter(Boolean);

    return `
      <tr class="border-b border-amber-100 dark:border-slate-700/60 hover:bg-amber-50/60 dark:hover:bg-slate-700/40 transition">
        <!-- Item Name, Icon & Boost Badge -->
        <td class="px-3 sm:px-4 py-3">
          <div class="flex items-start gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-amber-100/70 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-amber-200 dark:border-slate-600 mt-0.5">
              ${iconHtml}
            </div>
            <div class="space-y-1">
              <div class="font-bold text-xs sm:text-sm text-sfl-wood dark:text-amber-100">${row.name}</div>
              <div class="flex flex-wrap gap-1">
                ${boostLines.map(line => `
                  <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100/80 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60">
                    ⚡ ${line}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>
        </td>

        <!-- Owned Stock Quantity (Wardrobe / Inventory breakdown if multiple) -->
        <td class="px-3 sm:px-4 py-3 text-right">
          <div class="font-mono font-bold text-xs sm:text-sm ${row.qty > 0 ? 'text-sfl-wood dark:text-amber-100' : 'text-slate-400'}">
            ${row.qty.toLocaleString()}
          </div>
          ${(row.placedQty > 0 && row.invQty > 0) ? `
            <div class="text-[9px] text-slate-400 font-mono">
              Placed: ${row.placedQty} | Chest: ${row.invQty}
            </div>
          ` : (row.placedQty > 0 ? `
            <div class="text-[9px] text-lime-600 dark:text-lime-400 font-mono">
              (Placed)
            </div>
          ` : ((row.invQty > 0 && row.wardrobeQty > 0) ? `
            <div class="text-[9px] text-slate-400 font-mono">
              Inv: ${row.invQty} | Wardrobe: ${row.wardrobeQty}
            </div>
          ` : (row.wardrobeQty > 0 ? `
            <div class="text-[9px] text-slate-400 font-mono">
              (Wardrobe)
            </div>
          ` : '')))}
        </td>

        <!-- Floor Price from Marketplace -->
        <td class="px-3 sm:px-4 py-3 text-right font-mono text-xs">
          ${row.unitPrice > 0 ? `
            <div class="flex items-center justify-end gap-1 font-bold text-sfl-wood dark:text-amber-100">
              <span>${row.unitPrice.toFixed(2)}</span>
              ${FLOWER_IMG_SMALL_HTML}
            </div>
          ` : `
            <span class="text-slate-400 text-[11px]">Unlisted</span>
          `}
        </td>

        <!-- Gross Value -->
        <td class="px-3 sm:px-4 py-3 text-right font-mono text-xs hidden md:table-cell">
          <div class="flex items-center justify-end gap-1 text-slate-600 dark:text-slate-300">
            <span>${row.grossValue.toFixed(2)}</span>
            ${FLOWER_IMG_SMALL_HTML}
          </div>
        </td>

        <!-- Tax Rate & Deduction (Fixed 10%) -->
        <td class="px-3 sm:px-4 py-3 text-right font-mono text-xs hidden sm:table-cell">
          <div class="text-red-500 font-semibold">
            -${row.taxAmount.toFixed(2)}
          </div>
          <div class="text-[10px] text-slate-400">
            (10%)
          </div>
        </td>

        <!-- Net Value -->
        <td class="px-3 sm:px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-1 font-mono font-black text-xs sm:text-sm text-amber-900 dark:text-amber-300">
            <span>${row.netValue.toFixed(2)}</span>
            ${FLOWER_IMG_SMALL_HTML}
          </div>
          <div class="text-[10px] font-mono text-slate-400 font-semibold">
            ≈ $${row.netUsd.toFixed(2)}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-amber-100/70 dark:bg-slate-700/80 text-[11px] font-bold text-sfl-woodLight dark:text-slate-300 uppercase tracking-wider border-b border-sfl-cardBorder">
            <th class="px-3 sm:px-4 py-2.5">Boost Item</th>
            <th class="px-3 sm:px-4 py-2.5 text-right">Stock</th>
            <th class="px-3 sm:px-4 py-2.5 text-right">Floor Price</th>
            <th class="px-3 sm:px-4 py-2.5 text-right hidden md:table-cell">Gross</th>
            <th class="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">Tax (10%)</th>
            <th class="px-3 sm:px-4 py-2.5 text-right">Net Value</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}
