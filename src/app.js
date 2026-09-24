import { initSupabaseClient } from './config/constants.js';
import { renderHeader } from './components/header.js';
import { renderAuthBar } from './components/authBar.js';
import { renderNavTabs } from './components/navTabs.js';
import { renderWelcomeGate } from './components/welcomeGate.js';

window.renderWelcomeGate = renderWelcomeGate;

import { initAuth } from './services/auth.js';
import { PanelManager } from './services/panelManager.js';
import { initCalculatorPanel } from './panels/calculatorPanel.js';
import { initTradeHistoryPanel, fetchMarketplaceTrades } from './panels/tradeHistory/index.js';
import { initNpcGiftsPanel, renderNpcCards } from './panels/npc/npcGiftsPanel.js';
import { initTrackerPanel, loadCloudYieldHistory } from './panels/trackerPanel.js';
import { initWishlistPanel, renderWishlist } from './panels/wishlistPanel.js';
import { initTrackingModal } from './modals/trackingModal.js';
import { initWeeklySummaryModal } from './modals/weeklyModal.js';
import { initDashboardPanel, mountDashboard } from './panels/dashboard/dashboardPanel.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Bootstrapping SFL Resource Calculator...");

  // Dynamically load Supabase client configuration from environment variables
  await initSupabaseClient();

  renderWelcomeGate();
  renderHeader();
  renderAuthBar();
  renderNavTabs();

  initCalculatorPanel();
  initTradeHistoryPanel();
  initNpcGiftsPanel();
  initTrackerPanel();
  initWishlistPanel();
  initDashboardPanel();
  initTrackingModal();
  initWeeklySummaryModal();

  let lastYieldFetch = 0;

  PanelManager.register('dashboard', {
    onMount: async () => {
      const localSnapshots = localStorage.getItem('sfl_daily_snapshots');
      if (!localSnapshots || localSnapshots === '[]') {
        if (typeof window.loadCloudYieldHistory === 'function') {
          try { await window.loadCloudYieldHistory(); } catch (_) {}
        }
      }
      mountDashboard();
    }
  });

  PanelManager.register('calc', {
    onMount: () => {
      console.log("Daily Tracker Panel Active");
      if (Date.now() - lastYieldFetch > 180000) {
        lastYieldFetch = Date.now();
        loadCloudYieldHistory();
      }
    }
  });

  PanelManager.register('tradehistory', {
    onMount: () => {
      // Re-renders instant in-memory trades without network requests if loaded recently
      fetchMarketplaceTrades(false);
    }
  });

  PanelManager.register('npc', {
    onMount: () => renderNpcCards()
  });

  PanelManager.register('wishlist', {
    onMount: () => renderWishlist()
  });

  // Initializes tabs and restores last opened tab automatically
  PanelManager.initTabs();

  await initAuth();

  console.log("✅ Component rendering & app initialization complete!");
});
