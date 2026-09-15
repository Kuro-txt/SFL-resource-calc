// ─── Dashboard Panel ──────────────────────────────────────────────────────────
// Unified overview: Items Earned, Items Spent, Trades summary, Deliveries.

import { renderEarnedSection } from './dashboardEarned.js';
import { renderSpentSection } from './dashboardSpent.js';
import { renderTradesSection } from './dashboardTrades.js';
import { renderDeliveriesSection } from './dashboardDeliveries.js';

let initialized = false;

function renderTemplate() {
  const container = document.getElementById('dashboard-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-5">
      <!-- Header -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>📊</span> Dashboard
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            Your farm at a glance — earnings, spending, trades, and deliveries.
          </p>
        </div>
        <button id="dashboard-refresh-btn"
          class="bg-sfl-wood text-amber-200 px-3 py-1.5 rounded-lg font-bold text-xs border-2 border-sfl-dirt shadow-md hover:bg-sfl-woodLight transition cursor-pointer">
          🔄 Refresh
        </button>
      </div>

      <!-- 2x2 card grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- Items Earned -->
        <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm">
          <div id="dash-earned-mount"></div>
        </div>

        <!-- Items Spent -->
        <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm">
          <div id="dash-spent-mount"></div>
        </div>

        <!-- Trades -->
        <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm">
          <div id="dash-trades-mount"></div>
        </div>

        <!-- Deliveries -->
        <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder shadow-sm">
          <div id="dash-deliveries-mount"></div>
        </div>

      </div>
    </div>`;
}

async function populateSections() {
  renderEarnedSection(document.getElementById('dash-earned-mount'));
  await renderSpentSection(document.getElementById('dash-spent-mount'));
  await renderTradesSection(document.getElementById('dash-trades-mount'));
  renderDeliveriesSection(document.getElementById('dash-deliveries-mount'));
}

export function initDashboardPanel() {
  // Render template once (HTML structure)
  renderTemplate();
  initialized = true;

  document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => {
    populateSections();
  });
}

export async function mountDashboard() {
  if (!initialized) {
    initDashboardPanel();
  } else {
    // Re-render template to clear stale state
    renderTemplate();
    document.getElementById('dashboard-refresh-btn')?.addEventListener('click', () => {
      populateSections();
    });
  }
  await populateSections();
}
