// --- MAIN APPLICATION ENTRY POINT ---

import { initAuth } from './services/auth.js';
import { PanelManager } from './services/panelManager.js';
import { initCalculatorPanel } from './panels/calculatorPanel.js';
import { initTrackerPanel } from './panels/trackerPanel.js';
import { initWishlistPanel, renderWishlist } from './panels/wishlistPanel.js';
import { initTrackingModal } from './modals/trackingModal.js';
import { initWeeklySummaryModal } from './modals/weeklyModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Bootstrapping SFL Resource Calculator...");

  // 1. Initialize Authentication & User Session
  await initAuth();

  // 2. Register UI Panels in Manager
  PanelManager.register('calc', {
    onMount: () => console.log("Calculator Panel Active")
  });

  PanelManager.register('wishlist', {
    onMount: () => renderWishlist()
  });

  // 3. Initialize Panel Managers & Tabs
  PanelManager.initTabs();

  // 4. Initialize Core Modules
  initCalculatorPanel();
  initTrackerPanel();
  initWishlistPanel();

  // 5. Initialize Modals
  initTrackingModal();
  initWeeklySummaryModal();

  console.log("✅ App initialization complete!");
});
