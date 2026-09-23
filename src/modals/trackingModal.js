import { 
  SEARCH_EXCLUDED_KEYS, 
  ALLOWED_DIFFERENCE_ITEMS, 
  SFL_PLOT_CROPS, 
  SFL_GREENHOUSE_CROPS, 
  SFL_FRUITS, 
  isExcludedItem 
} from '../config/constants.js';

window.trackedTargets = window.trackedTargets || [];

function getItemIcon(cleanName) {
  if (SFL_PLOT_CROPS.has(cleanName) || SFL_GREENHOUSE_CROPS.has(cleanName)) return '🌱';
  if (SFL_FRUITS.has(cleanName)) return '🍎';
  if (cleanName === 'wood') return '🌲';
  if (cleanName === 'stone') return '🪨';
  if (['iron', 'gold', 'crimstone', 'obsidian'].includes(cleanName)) return '⛏️';
  if (['egg', 'milk', 'honey', 'wool', 'merino wool', 'feather', 'leather'].includes(cleanName)) return '🥚';
  if (cleanName.includes('emblem')) return '🏅';
  if (cleanName.includes('bait') || cleanName.includes('fish')) return '🎣';
  return '⭐';
}

function getItemCategory(cleanName) {
  if (SFL_PLOT_CROPS.has(cleanName) || SFL_GREENHOUSE_CROPS.has(cleanName) || SFL_FRUITS.has(cleanName)) {
    return 'Crops & Fruits';
  }
  if (['wood', 'stone', 'iron', 'gold', 'crimstone', 'obsidian', 'salt'].includes(cleanName)) {
    return 'Resources & Minerals';
  }
  if (['egg', 'milk', 'honey', 'wool', 'merino wool', 'feather', 'leather'].includes(cleanName)) {
    return 'Livestock & Animals';
  }
  return 'Special & Emblems';
}

export function getItemCatalog() {
  const itemsMap = new Map();

  // 1. Seed with the 64 official tracked difference items
  ALLOWED_DIFFERENCE_ITEMS.forEach(name => {
    const cleanKey = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = name.toLowerCase().trim();
    itemsMap.set(cleanName, {
      name,
      key: cleanName,
      cleanKey,
      icon: getItemIcon(cleanName),
      category: getItemCategory(cleanName)
    });
  });

  // 2. Overlay any additional valid items found in window.allPrices
  if (window.allPrices && typeof window.allPrices === 'object') {
    Object.keys(window.allPrices).forEach(key => {
      let lowerKey = key.toLowerCase().trim();
      if (SEARCH_EXCLUDED_KEYS.includes(lowerKey) || lowerKey.includes('updated')) return;
      if (typeof isExcludedItem === 'function' && isExcludedItem(key)) return;
      
      let displayName = key.replace(/^\[.*?\]\s*/, '').trim();
      let cleanName = displayName.toLowerCase().trim();
      let cleanKey = cleanName.replace(/[^a-z0-9]/g, '');

      if (!itemsMap.has(cleanName)) {
        itemsMap.set(cleanName, {
          name: displayName,
          key: cleanName,
          cleanKey,
          icon: getItemIcon(cleanName),
          category: getItemCategory(cleanName)
        });
      }
    });
  }

  return Array.from(itemsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function renderTrackingModalTemplate() {
  const container = document.getElementById('tracking-modal-mount');
  if (!container) return;

  container.innerHTML = `
    <div id="tracking-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-sfl-card border-4 border-sfl-wood rounded-2xl w-full max-w-lg shadow-2xl relative space-y-0 overflow-hidden">
        <div class="bg-sfl-wood text-amber-200 px-5 py-3 border-b-2 border-sfl-dirt flex justify-between items-center">
          <h3 class="font-pixel text-xl sm:text-2xl font-bold tracking-wider text-amber-300 flex items-center gap-2">
            <span>⚙️</span> Persistent Tracking Targets
          </h3>
          <button id="close-tracking-modal-btn" class="text-amber-200 hover:text-white font-bold text-lg cursor-pointer">✕</button>
        </div>

        <div class="p-5 space-y-4">
          <p class="text-xs text-sfl-woodLight font-medium">
            Select items to automatically calculate yields for at 22:30 UTC against your 00:00 UTC baseline.
          </p>

          <!-- SEARCH & COMBOBOX DROPDOWN ROW -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="target-search-input" class="block text-xs font-bold uppercase tracking-wider text-sfl-wood">
                🔍 Add Item to Track
              </label>
              <span id="target-catalog-count" class="text-[11px] font-bold text-sfl-woodLight"></span>
            </div>
            
            <div class="relative">
              <input type="text" id="target-search-input" placeholder="Click to choose or type to filter (e.g. Sunflower, Iron)..." autocomplete="off" class="w-full sfl-input rounded-xl pl-3 pr-10 py-2.5 text-xs text-sfl-dirt focus:outline-none focus:ring-2 focus:ring-sfl-gold font-medium">
              <button type="button" id="target-dropdown-toggle-btn" class="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-sfl-wood hover:text-sfl-dirt transition cursor-pointer" title="Toggle full item list">
                <svg id="target-dropdown-chevron" class="w-4 h-4 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <ul id="target-search-menu" class="hidden absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border-2 border-sfl-woodLight dark:border-slate-700 rounded-xl shadow-2xl z-50 divide-y divide-sfl-cardBorder/30 text-xs">
              </ul>
            </div>

            <!-- ONE-CLICK PRESET BUTTONS -->
            <div class="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span class="text-[10px] font-bold text-sfl-woodLight uppercase">Presets:</span>
              <button type="button" id="preset-crops-btn" class="bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs">
                <span>🌾</span> All Crops (32)
              </button>
              <button type="button" id="preset-resources-btn" class="bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sfl-dirt dark:text-amber-200 border border-amber-300 dark:border-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs">
                <span>⛏️</span> Resources & Animals (14)
              </button>
              <button type="button" id="preset-all-btn" class="bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs">
                <span>✨</span> Track All (64)
              </button>
              <button type="button" id="preset-clear-btn" class="bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-700 px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs">
                <span>✕</span> Clear
              </button>
            </div>
          </div>

          <!-- CURRENTLY TRACKED TARGETS BADGE CONTAINER -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold uppercase tracking-wider text-sfl-wood">
                Currently Tracked Targets
              </label>
              <span id="tracked-badge-count" class="text-[11px] font-bold text-amber-800"></span>
            </div>
            <div id="tracked-targets-container" class="bg-white/80 dark:bg-slate-800/80 border-2 border-sfl-cardBorder dark:border-slate-700 rounded-xl p-3 min-h-[60px] max-h-48 overflow-y-auto flex flex-wrap gap-1.5 items-center">
              <span class="text-xs text-sfl-woodLight italic">No items added to persistent tracking list yet.</span>
            </div>
          </div>
        </div>

        <div class="bg-sfl-cardBorder/20 px-5 py-3 border-t border-sfl-cardBorder flex justify-end gap-2">
          <button id="cancel-tracking-btn" class="bg-gray-300 text-sfl-dirt font-bold px-4 py-2 rounded-xl text-xs hover:bg-gray-400 transition cursor-pointer">
            Close
          </button>
          <button id="save-tracking-targets-btn" class="bg-sfl-green text-white font-bold px-5 py-2 rounded-xl text-xs hover:bg-green-700 transition shadow-md cursor-pointer flex items-center gap-1.5">
            <span>💾</span> Save Targets
          </button>
        </div>
      </div>
    </div>
  `;
}

function updateChevron(isOpen) {
  const chevron = document.getElementById('target-dropdown-chevron');
  if (chevron) {
    if (isOpen) {
      chevron.classList.add('rotate-180');
    } else {
      chevron.classList.remove('rotate-180');
    }
  }
}

function updateCatalogCount() {
  const countEl = document.getElementById('target-catalog-count');
  const badgeCountEl = document.getElementById('tracked-badge-count');
  const count = window.trackedTargets?.length || 0;
  if (countEl) countEl.textContent = `${count} selected`;
  if (badgeCountEl) badgeCountEl.textContent = count > 0 ? `(${count} items)` : '';
}

function toggleTrackedTarget(key) {
  let cleanK = key.toLowerCase().trim();
  let existingIndex = window.trackedTargets.findIndex(t => {
    let cleanT = String(t).toLowerCase().trim().replace(/^\[.*?\]\s*/, '');
    return cleanT === cleanK;
  });

  if (existingIndex >= 0) {
    window.trackedTargets.splice(existingIndex, 1);
  } else {
    window.trackedTargets.push(cleanK);
  }
  localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));
  renderTrackedBadges();
  updateCatalogCount();
}

export function initTrackingModal() {
  renderTrackingModalTemplate();

  const openBtn = document.getElementById('open-tracking-modal-btn');
  const closeBtn = document.getElementById('close-tracking-modal-btn');
  const cancelBtn = document.getElementById('cancel-tracking-btn');
  const saveBtn = document.getElementById('save-tracking-targets-btn');
  const modal = document.getElementById('tracking-modal');

  const targetInput = document.getElementById('target-search-input');
  const targetMenu = document.getElementById('target-search-menu');
  const dropdownBtn = document.getElementById('target-dropdown-toggle-btn');

  if (!modal) return;

  function renderMenu(query = '') {
    if (!targetMenu) return;
    const catalog = getItemCatalog();
    const cleanQuery = (query || '').toLowerCase().trim();
    targetMenu.innerHTML = '';

    const matches = catalog.filter(item => {
      if (!cleanQuery) return true;
      return item.name.toLowerCase().includes(cleanQuery) || 
             item.category.toLowerCase().includes(cleanQuery);
    });

    if (matches.length === 0) {
      targetMenu.innerHTML = `<li class="p-3 text-sfl-woodLight italic text-center">No matching items found for "${query}"</li>`;
      targetMenu.classList.remove('hidden');
      updateChevron(true);
      return;
    }

    // Top status header
    const countHeader = document.createElement('li');
    countHeader.className = 'px-3 py-1.5 bg-amber-50 dark:bg-slate-800 text-[10px] font-bold text-sfl-wood sticky top-0 border-b border-sfl-cardBorder/40 flex justify-between items-center z-10';
    countHeader.innerHTML = `
      <span>Available items (${matches.length})</span>
      <span class="text-sfl-woodLight font-normal">Click to toggle tracking</span>
    `;
    targetMenu.appendChild(countHeader);

    matches.forEach(item => {
      const isTracked = window.trackedTargets.some(t => {
        let cleanT = String(t).toLowerCase().trim().replace(/^\[.*?\]\s*/, '');
        return cleanT === item.key || cleanT === item.cleanKey;
      });

      const li = document.createElement('li');
      li.className = `p-2.5 transition flex justify-between items-center cursor-pointer select-none ${
        isTracked 
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 hover:bg-emerald-100/80 text-emerald-900 dark:text-emerald-300 font-bold' 
          : 'hover:bg-amber-100 dark:hover:bg-slate-800 text-sfl-dirt dark:text-amber-100 font-medium'
      }`;

      li.innerHTML = `
        <div class="flex items-center gap-2 overflow-hidden mr-2">
          <span>${item.icon}</span>
          <span class="font-bold truncate">${item.name}</span>
          <span class="text-[9px] text-sfl-woodLight dark:text-slate-400 font-normal truncate">(${item.category})</span>
        </div>
        ${isTracked 
          ? '<span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 shrink-0">✓ Tracked</span>'
          : '<span class="text-[10px] font-bold text-sfl-wood bg-amber-100/90 dark:bg-slate-700 px-2 py-0.5 rounded border border-amber-300/80 dark:border-slate-600 hover:bg-amber-200 shrink-0">+ Track</span>'
        }
      `;

      li.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTrackedTarget(item.key);
        renderMenu(targetInput ? targetInput.value : '');
      });

      targetMenu.appendChild(li);
    });

    targetMenu.classList.remove('hidden');
    updateChevron(true);
  }

  const showModal = () => {
    renderTrackedBadges();
    updateCatalogCount();
    modal.classList.remove('hidden');
    renderMenu(targetInput ? targetInput.value : '');
  };

  const hideModal = () => {
    modal.classList.add('hidden');
    if (targetMenu) targetMenu.classList.add('hidden');
    updateChevron(false);
    if (targetInput) targetInput.value = '';
  };

  openBtn?.addEventListener('click', showModal);
  closeBtn?.addEventListener('click', hideModal);
  cancelBtn?.addEventListener('click', hideModal);

  // Combobox input interaction
  targetInput?.addEventListener('input', () => {
    renderMenu(targetInput.value);
  });

  targetInput?.addEventListener('focus', () => {
    renderMenu(targetInput.value);
  });

  targetInput?.addEventListener('click', () => {
    renderMenu(targetInput.value);
  });

  dropdownBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!targetMenu) return;
    const isHidden = targetMenu.classList.contains('hidden');
    if (isHidden) {
      renderMenu(targetInput ? targetInput.value : '');
      targetInput?.focus();
    } else {
      targetMenu.classList.add('hidden');
      updateChevron(false);
    }
  });

  document.addEventListener('click', (e) => {
    if (targetInput && targetMenu && dropdownBtn) {
      if (!targetInput.contains(e.target) && !targetMenu.contains(e.target) && !dropdownBtn.contains(e.target)) {
        targetMenu.classList.add('hidden');
        updateChevron(false);
      }
    }
  });

  // Preset buttons
  document.getElementById('preset-crops-btn')?.addEventListener('click', () => {
    const crops = getItemCatalog().filter(i => i.category === 'Crops & Fruits');
    crops.forEach(i => {
      if (!window.trackedTargets.includes(i.key)) {
        window.trackedTargets.push(i.key);
      }
    });
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));
    renderTrackedBadges();
    updateCatalogCount();
    renderMenu(targetInput ? targetInput.value : '');
  });

  document.getElementById('preset-resources-btn')?.addEventListener('click', () => {
    const res = getItemCatalog().filter(i => i.category === 'Resources & Minerals' || i.category === 'Livestock & Animals');
    res.forEach(i => {
      if (!window.trackedTargets.includes(i.key)) {
        window.trackedTargets.push(i.key);
      }
    });
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));
    renderTrackedBadges();
    updateCatalogCount();
    renderMenu(targetInput ? targetInput.value : '');
  });

  document.getElementById('preset-all-btn')?.addEventListener('click', () => {
    const all = getItemCatalog();
    all.forEach(i => {
      if (!window.trackedTargets.includes(i.key)) {
        window.trackedTargets.push(i.key);
      }
    });
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));
    renderTrackedBadges();
    updateCatalogCount();
    renderMenu(targetInput ? targetInput.value : '');
  });

  document.getElementById('preset-clear-btn')?.addEventListener('click', () => {
    window.trackedTargets = [];
    localStorage.setItem('sfl_tracked_targets', '[]');
    renderTrackedBadges();
    updateCatalogCount();
    renderMenu(targetInput ? targetInput.value : '');
  });

  saveBtn?.addEventListener('click', async () => {
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));

    const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);

    if (client) {
      try {
        const activeUser = window.currentUser || (await client.auth.getUser())?.data?.user;

        if (activeUser) {
          window.currentUser = activeUser;
          const { error } = await client
            .from('profiles')
            .upsert({ 
              id: activeUser.id,
              tracked_items: window.trackedTargets 
            }, { onConflict: 'id' });

          if (error) {
            console.warn("Supabase profile save notice:", error.message);
          }
        } else {
          // Farm-ID-only user (not authenticated via Supabase auth) — update by farm_id
          const currentFarmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim();
          if (currentFarmId) {
            const { error: fErr } = await client
              .from('profiles')
              .update({ tracked_items: window.trackedTargets })
              .eq('farm_id', currentFarmId);
            if (fErr) console.warn("Supabase farm profile save notice:", fErr.message);
          }
        }
      } catch (err) {
        console.warn("Failed to reach Supabase:", err.message);
      }
    }

    renderTrackedBadges();
    if (typeof window.renderSnapshotHistory === 'function') {
      window.renderSnapshotHistory();
    }
    alert('✅ Persistent tracking targets saved successfully!');
    hideModal();
  });
}

export function renderTrackedBadges() {
  const container = document.getElementById('tracked-targets-container');
  if (!container) return;

  container.innerHTML = '';

  if (!window.trackedTargets || window.trackedTargets.length === 0) {
    const rawLocal = localStorage.getItem('sfl_tracked_targets');
    if (rawLocal) {
      try { window.trackedTargets = JSON.parse(rawLocal) || []; } catch (e) {}
    }
  }

  if (!window.trackedTargets || window.trackedTargets.length === 0) {
    container.innerHTML = '<span class="text-xs text-sfl-woodLight italic">No items added to persistent tracking list yet. Click the dropdown above or choose a preset.</span>';
    return;
  }

  window.trackedTargets.forEach((itemName, index) => {
    let cleanStr = String(itemName).replace(/^\[.*?\]\s*/, '').trim();
    let displayName = cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1);
    let icon = getItemIcon(cleanStr.toLowerCase());
    // Escape single quotes in key for safe inline onclick
    const safeKey = itemName.replace(/'/g, "\\'");
    
    const badge = document.createElement('span');
    badge.className = 'inline-flex items-center gap-1.5 bg-sfl-gold/20 border border-sfl-gold text-sfl-dirt px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs';
    badge.innerHTML = `
      <span>${icon}</span>
      <span>${displayName}</span>
      <button type="button" class="text-sfl-accent hover:text-red-700 font-extrabold cursor-pointer ml-1" onclick="removeTrackedTargetByKey('${safeKey}')">✕</button>
    `;
    container.appendChild(badge);
  });

  updateCatalogCount();
}

export function removeTrackedTarget(index) {
  if (window.trackedTargets && window.trackedTargets[index] !== undefined) {
    window.trackedTargets.splice(index, 1);
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));
    renderTrackedBadges();
    updateCatalogCount();
    if (typeof window.renderSnapshotHistory === 'function') {
      window.renderSnapshotHistory();
    }
  }
}

export function removeTrackedTargetByKey(key) {
  if (!window.trackedTargets) return;
  const idx = window.trackedTargets.indexOf(key);
  if (idx >= 0) {
    window.trackedTargets.splice(idx, 1);
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));
    renderTrackedBadges();
    updateCatalogCount();
    if (typeof window.renderSnapshotHistory === 'function') {
      window.renderSnapshotHistory();
    }
  }
}

window.renderTrackedBadges = renderTrackedBadges;
window.removeTrackedTarget = removeTrackedTarget;
window.removeTrackedTargetByKey = removeTrackedTargetByKey;
window.openTrackingModal = function() {
  const modal = document.getElementById('tracking-modal');
  if (modal) {
    renderTrackedBadges();
    updateCatalogCount();
    modal.classList.remove('hidden');
    const targetInput = document.getElementById('target-search-input');
    const targetMenu = document.getElementById('target-search-menu');
    if (targetMenu && targetInput) {
      targetInput.focus();
    }
  }
};
