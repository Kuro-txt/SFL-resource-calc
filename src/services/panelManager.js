// --- DYNAMIC PANEL ROUTER & TAB MANAGER ---

const panels = {};
let activePanelId = null;

export const PanelManager = {
  /**
   * Register a new panel module.
   * @param {string} id - Unique identifier (e.g., 'calc', 'wishlist')
   * @param {Object} options - Lifecycle hooks { onMount, onUnmount }
   */
  register(id, { onMount, onUnmount } = {}) {
    panels[id] = { onMount, onUnmount };
  },

  /**
   * Switch active view tab.
   * @param {string} targetId - ID of panel to activate
   */
  switch(targetId) {
    if (!panels[targetId] && !document.getElementById(`${targetId}-section`)) {
      console.warn(`Panel '${targetId}' is not registered.`);
      return;
    }

    // Run unmount lifecycle on previous panel
    if (activePanelId && panels[activePanelId]?.onUnmount) {
      panels[activePanelId].onUnmount();
    }

    // Toggle DOM section visibility and tab styling
    Object.keys(panels).forEach(id => {
      const sectionEl = document.getElementById(`${id}-section`);
      const btnEl = document.getElementById(`tab-${id}-btn`);

      if (id === targetId) {
        if (sectionEl) sectionEl.classList.remove('hidden');
        if (btnEl) {
          btnEl.className = "bg-sfl-wood text-amber-200 px-5 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center gap-2 cursor-pointer";
        }
      } else {
        if (sectionEl) sectionEl.classList.add('hidden');
        if (btnEl) {
          btnEl.className = "bg-amber-100/60 text-sfl-woodLight px-5 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-2 cursor-pointer";
        }
      }
    });

    activePanelId = targetId;

    // Run mount lifecycle on active panel
    if (panels[targetId]?.onMount) {
      panels[targetId].onMount();
    }
  },

  /**
   * Initialize tab button event listeners.
   */
  initTabs() {
    const tabCalcBtn = document.getElementById('tab-calc-btn');
    const tabWishlistBtn = document.getElementById('tab-wishlist-btn');

    tabCalcBtn?.addEventListener('click', () => this.switch('calc'));
    tabWishlistBtn?.addEventListener('click', () => this.switch('wishlist'));
  }
};
