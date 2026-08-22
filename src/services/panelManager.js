const panels = {};
let activePanelId = 'calc';

export const PanelManager = {
  register(id, { onMount, onUnmount } = {}) {
    panels[id] = { onMount, onUnmount };
  },

  switch(targetId) {
    if (!panels[targetId] && !document.getElementById(`${targetId === 'croptracker' ? 'crop-tracker' : targetId}-section`)) {
      console.warn(`Panel '${targetId}' is not registered.`);
      return;
    }

    if (activePanelId && panels[activePanelId]?.onUnmount) {
      panels[activePanelId].onUnmount();
    }

    ['calc', 'croptracker', 'wishlist'].forEach(id => {
      const sectionEl = document.getElementById(`${id === 'croptracker' ? 'crop-tracker' : id}-section`);
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

    if (panels[targetId]?.onMount) {
      panels[targetId].onMount();
    }
  },

  initTabs() {
    document.getElementById('tab-calc-btn')?.addEventListener('click', () => this.switch('calc'));
    document.getElementById('tab-croptracker-btn')?.addEventListener('click', () => this.switch('croptracker'));
    document.getElementById('tab-wishlist-btn')?.addEventListener('click', () => this.switch('wishlist'));
  }
};
