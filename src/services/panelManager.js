const panels = {};
let activePanelId = null;

export const PanelManager = {
  register(id, { onMount, onUnmount } = {}) {
    panels[id] = { onMount, onUnmount };
  },

  switch(targetId) {
    const validTabs = ['calc', 'croptracker', 'npc', 'wishlist'];
    if (!validTabs.includes(targetId)) {
      targetId = 'calc';
    }

    if (activePanelId && panels[activePanelId]?.onUnmount) {
      panels[activePanelId].onUnmount();
    }

    validTabs.forEach(id => {
      let sectionId = `${id}-section`;
      if (id === 'croptracker') sectionId = 'crop-tracker-section';
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

    if (panels[targetId]?.onMount) {
      panels[targetId].onMount();
    }
  },

  initTabs() {
    document.getElementById('tab-calc-btn')?.addEventListener('click', () => this.switch('calc'));
    document.getElementById('tab-croptracker-btn')?.addEventListener('click', () => this.switch('croptracker'));
    document.getElementById('tab-npc-btn')?.addEventListener('click', () => this.switch('npc'));
    document.getElementById('tab-wishlist-btn')?.addEventListener('click', () => this.switch('wishlist'));

    // Restore the last opened tab or default to 'calc'
    const savedTab = localStorage.getItem('sfl_active_tab') || 'calc';
    this.switch(savedTab);
  }
};
