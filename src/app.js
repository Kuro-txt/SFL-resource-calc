import { renderHeader } from './components/header.js';
import { renderAuthBar } from './components/authBar.js';
import { renderNavTabs } from './components/navTabs.js';

import { initAuth } from './services/auth.js';
import { PanelManager } from './services/panelManager.js';
import { initCalculatorPanel } from './panels/calculatorPanel.js';
import { initCropTrackerPanel } from './panels/cropTrackerPanel.js';
import { initTradeHistoryPanel, fetchMarketplaceTrades } from './panels/tradeHistoryPanel.js';
import { initNpcGiftsPanel, renderNpcCards } from './panels/npcGiftsPanel.js';
import { initTrackerPanel, loadCloudYieldHistory } from './panels/trackerPanel.js';
import { initWishlistPanel, renderWishlist } from './panels/wishlistPanel.js';
import { initTrackingModal } from './modals/trackingModal.js';
import { initWeeklySummaryModal } from './modals/weeklyModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Bootstrapping SFL Resource Calculator...");

  renderHeader();
  renderAuthBar();
  renderNavTabs();

  initCalculatorPanel();
  initCropTrackerPanel();
  initTradeHistoryPanel();
  initNpcGiftsPanel();
  initTrackerPanel();
  initWishlistPanel();
  initTrackingModal();
  initWeeklySummaryModal();

  PanelManager.register('calc', {
    onMount: () => {
      console.log("Daily Tracker Panel Active");
      loadCloudYieldHistory();
    }
  });

  PanelManager.register('croptracker', {
    onMount: () => console.log("Crop Tracker V1 Active")
  });

  PanelManager.register('tradehistory', {
    onMount: () => fetchMarketplaceTrades()
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
