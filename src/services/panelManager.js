const panels = {};
let activePanelId = null;

const TAB_TO_HASH = {
  calc: 'daily',
  croptracker: 'crops',
  tradehistory: 'trades',
  npc: 'npc',
  wishlist: 'wishlist'
};

const HASH_TO_TAB = {
  daily: 'calc',
  calc: 'calc',
  'daily-tracker': 'calc',
  crops: 'croptracker',
  croptracker: 'croptracker',
  'crop-tracker': 'croptracker',
  trades: 'tradehistory',
  tradehistory: 'tradehistory',
  'trade-history': 'tradehistory',
  npc: 'npc',
  'npc-gifts': 'npc',
  gifts: 'npc',
  wishlist: 'wishlist',
  nfts: 'wishlist',
  'nft-wishlist': 'wishlist'
};

export const PanelManager = {
  register(id, { onMount, onUnmount } = {}) {
    panels[id] = { onMount, onUnmount };
  },

  switch(targetId, updateUrlHash = true) {
    const validTabs = ['calc', 'croptracker', 'tradehistory', 'npc', 'wishlist'];
    if (!validTabs.includes(targetId)) {
      targetId = 'calc';
    }

    if (activePanelId && panels[activePanelId]?.onUnmount) {
      panels[activePanelId].onUnmount();
    }

    validTabs.forEach(id => {
      let sectionId = `${id}-section`;
      if (id === 'croptracker') sectionId = 'crop-tracker-section';
      if (id === 'tradehistory') sectionId = 'trade-history-section';
      if (id === 'npc') sectionId = 'npc-gifts-section';

      const sectionEl = document.getElementById(sectionId);
      const btnEl = document.getElementById(`tab-${id}-btn`);

      if (id === targetId) {
        if (sectionEl) sectionEl.classList.remove('hidden');
        if (btnEl) {
          btnEl.className = "bg-sfl-wood text-amber-200 px-4 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center gap-1.5 cursor-pointer";
        }
      } else {
        if (sectionEl) sectionEl.classList.add('hidden');
        if (btnEl) {
          btnEl.className = "bg-amber-100/60 text-sfl-woodLight px-4 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-200/60 transition flex items-center gap-1.5 cursor-pointer";
        }
      }
    });

    activePanelId = targetId;
    localStorage.setItem('sfl_active_tab', targetId);

    // Sync URL hash for bookmarking & browser back/forward buttons
    if (updateUrlHash) {
      const targetHash = `#${TAB_TO_HASH[targetId] || targetId}`;
      if (window.location.hash !== targetHash) {
        history.pushState(null, '', targetHash);
      }
    }

    if (panels[targetId]?.onMount) {
      panels[targetId].onMount();
    }
  },

  getTabFromUrlHash() {
    const rawHash = (window.location.hash || '').replace(/^#/, '').toLowerCase().trim();
    if (!rawHash) return null;
    return HASH_TO_TAB[rawHash] || null;
  },

  initTabs() {
    document.getElementById('tab-calc-btn')?.addEventListener('click', () => this.switch('calc'));
    document.getElementById('tab-croptracker-btn')?.addEventListener('click', () => this.switch('croptracker'));
    document.getElementById('tab-tradehistory-btn')?.addEventListener('click', () => this.switch('tradehistory'));
    document.getElementById('tab-npc-btn')?.addEventListener('click', () => this.switch('npc'));
    document.getElementById('tab-wishlist-btn')?.addEventListener('click', () => this.switch('wishlist'));

    // Listen to browser Back/Forward navigation or direct hash changes
    window.addEventListener('hashchange', () => {
      const tabFromHash = this.getTabFromUrlHash();
      if (tabFromHash && tabFromHash !== activePanelId) {
        this.switch(tabFromHash, false);
      }
    });

    window.addEventListener('popstate', () => {
      const tabFromHash = this.getTabFromUrlHash();
      if (tabFromHash && tabFromHash !== activePanelId) {
        this.switch(tabFromHash, false);
      }
    });

    // 1. Initial Priority: URL Hash (e.g. /#trades, /#crops)
    const urlTab = this.getTabFromUrlHash();
    if (urlTab) {
      this.switch(urlTab, false);
    } else {
      // 2. Fallback: Last opened tab from localStorage or default 'calc'
      const savedTab = localStorage.getItem('sfl_active_tab') || 'calc';
      this.switch(savedTab, true);
    }
  }
};
