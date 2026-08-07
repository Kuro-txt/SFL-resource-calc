import { renderHeader } from './components/header.js';
import { renderAuthBar } from './components/authBar.js';
import { renderNavTabs } from './components/navTabs.js';

import { initAuth } from './services/auth.js';
import { PanelManager } from './services/panelManager.js';
import { initCalculatorPanel } from './panels/calculatorPanel.js';
import { initTrackerPanel } from './panels/trackerPanel.js';
import { initWishlistPanel, renderWishlist } from './panels/wishlistPanel.js';
import { initTrackingModal } from './modals/trackingModal.js';
import { initWeeklySummaryModal } from './modals/weeklyModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Bootstrapping SFL Resource Calculator...");

  // 1. Render UI Shell Layout
  renderHeader();
  renderAuthBar();
  renderNavTabs();

  // 2. Initialize Self-Rendering Panels & Modals
  initCalculatorPanel();
  initTrackerPanel();
  initWishlistPanel();
  initTrackingModal();
  initWeeklySummaryModal();

  // 3. Register Panels & Bind Tabs
  PanelManager.register('calc', {
    onMount: () => console.log("Calculator Panel Active")
  });

  PanelManager.register('wishlist', {
    onMount: () => renderWishlist()
  });

  PanelManager.initTabs();

  // 4. Initialize User Authentication & Cloud Sync
  await initAuth();

  console.log("✅ Component rendering & app initialization complete!");
});
