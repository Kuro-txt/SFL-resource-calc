import { renderHeader } from './components/header.js';
import { renderAuthBar } from './components/authBar.js';
import { initFarmSync } from './components/farmSyncBar.js';
import { renderNavTabs } from './components/navTabs.js';

import { initAuth } from './services/auth.js';
import { PanelManager } from './services/panelManager.js';
import { initCalculatorPanel } from './panels/calculatorPanel.js';
import { initCropTrackerPanel } from './panels/cropTrackerPanel.js';
import { initTrackerPanel } from './panels/trackerPanel.js';
import { initWishlistPanel, renderWishlist } from './panels/wishlistPanel.js';
import { initTrackingModal } from './modals/trackingModal.js';
import { initWeeklySummaryModal } from './modals/weeklyModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Bootstrapping SFL Resource Calculator...");

  renderHeader();
  renderAuthBar();
  initFarmSync();
  renderNavTabs();

  initCalculatorPanel();
  initCropTrackerPanel();
  initTrackerPanel();
  initWishlistPanel();
  initTrackingModal();
  initWeeklySummaryModal();

  PanelManager.register('calc', {
    onMount: () => console.log("Daily Tracker Panel Active")
  });

  PanelManager.register('croptracker', {
    onMount: () => console.log("Crop Tracker V1 Active")
  });

  PanelManager.register('wishlist', {
    onMount: () => renderWishlist()
  });

  PanelManager.initTabs();

  await initAuth();

  console.log("✅ Component rendering & app initialization complete!");
});
