import { SEARCH_EXCLUDED_KEYS } from '../config/constants.js';

window.trackedTargets = window.trackedTargets || [];

export function renderTrackingModalTemplate() {
  const container = document.getElementById('tracking-modal-mount');
  if (!container) return;

  container.innerHTML = `
    <div id="tracking-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-sfl-card border-4 border-sfl-wood rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative space-y-0">
        <div class="bg-sfl-wood text-amber-200 px-5 py-3 border-b-2 border-sfl-dirt flex justify-between items-center">
          <h3 class="font-pixel text-xl sm:text-2xl font-bold tracking-wider text-amber-300 flex items-center gap-2">
            <span>⚙️</span> Persistent Tracking Targets
          </h3>
          <button id="close-tracking-modal-btn" class="text-amber-200 hover:text-white font-bold text-lg cursor-pointer">✕</button>
        </div>

        <div class="p-5 space-y-4">
          <p class="text-xs text-sfl-woodLight font-medium">
            Select items to automatically calculate yields for at 22:00 UTC against your 00:00 UTC baseline.
          </p>

          <div class="relative">
            <label class="block text-xs font-bold uppercase tracking-wider text-sfl-wood mb-1">🔍 Add Item to Track</label>
            <input type="text" id="target-search-input" placeholder="Type item name (e.g. Sunflower, Iron)..." autocomplete="off" class="w-full sfl-input rounded-lg px-3 py-2 text-sm text-sfl-dirt focus:outline-none focus:ring-2 focus:ring-sfl-gold">
            <ul id="target-search-menu" class="hidden absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border-2 border-sfl-woodLight rounded-lg shadow-xl z-30 divide-y divide-sfl-cardBorder/30 text-sm">
              <li class="p-2 text-sfl-woodLight italic">Type to search...</li>
            </ul>
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-sfl-wood mb-1.5">Currently Tracked Targets</label>
            <div id="tracked-targets-container" class="bg-white/80 border-2 border-sfl-cardBorder rounded-xl p-3 min-h-[60px] flex flex-wrap gap-1.5 items-center">
              <span class="text-xs text-sfl-woodLight italic">No items added to persistent tracking list yet.</span>
            </div>
          </div>
        </div>

        <div class="bg-sfl-cardBorder/20 px-5 py-3 border-t border-sfl-cardBorder flex justify-end gap-2">
          <button id="cancel-tracking-btn" class="bg-gray-300 text-sfl-dirt font-bold px-4 py-2 rounded-xl text-xs hover:bg-gray-400 transition cursor-pointer">
            Close
          </button>
          <button id="save-tracking-targets-btn" class="bg-sfl-green text-white font-bold px-5 py-2 rounded-xl text-xs hover:bg-green-700 transition shadow-md cursor-pointer">
            💾 Save Targets
          </button>
        </div>
      </div>
    </div>
  `;
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

  if (!modal) return;

  const showModal = () => {
    renderTrackedBadges();
    modal.classList.remove('hidden');
  };

  const hideModal = () => {
    modal.classList.add('hidden');
    if (targetMenu) targetMenu.classList.add('hidden');
    if (targetInput) targetInput.value = '';
  };

  openBtn?.addEventListener('click', showModal);
  closeBtn?.addEventListener('click', hideModal);
  cancelBtn?.addEventListener('click', hideModal);

  if (targetInput && targetMenu) {
    targetInput.addEventListener('input', () => {
      const query = targetInput.value.toLowerCase().trim();
      targetMenu.innerHTML = '';

      if (!query) {
        targetMenu.classList.add('hidden');
        return;
      }

      const matches = Object.keys(window.allPrices || {})
        .filter(key => {
          let lowerKey = key.toLowerCase().trim();
          if (SEARCH_EXCLUDED_KEYS.includes(lowerKey) || lowerKey.includes('updated')) return false;
          if (typeof window.isExcludedItem === 'function' && window.isExcludedItem(key)) return false;
          let cleanKey = key.replace(/^\[.*?\]\s*/, '');
          return cleanKey.toLowerCase().includes(query) || lowerKey.includes(query);
        })
        .sort((a, b) => a.replace(/^\[.*?\]\s*/, '').localeCompare(b.replace(/^\[.*?\]\s*/, '')));

      if (matches.length === 0) {
        targetMenu.innerHTML = '<li class="p-2 text-sfl-woodLight italic">No matching items found</li>';
      } else {
        matches.forEach(itemKey => {
          let displayName = itemKey.replace(/^\[.*?\]\s*/, '');
          let cleanName = displayName.toLowerCase().trim();

          if (window.trackedTargets.includes(cleanName)) return;

          const li = document.createElement('li');
          li.className = 'p-2.5 hover:bg-amber-100 cursor-pointer transition flex justify-between items-center';
          li.innerHTML = `<span class="font-bold text-sfl-dirt">${displayName}</span>`;
          
          li.addEventListener('click', () => {
            if (!window.trackedTargets.includes(cleanName)) {
              window.trackedTargets.push(cleanName);
              renderTrackedBadges();
            }
            targetInput.value = '';
            targetMenu.classList.add('hidden');
          });
          targetMenu.appendChild(li);
        });
      }

      targetMenu.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!targetInput.contains(e.target) && !targetMenu.contains(e.target)) {
        targetMenu.classList.add('hidden');
      }
    });
  }

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
            console.error("Supabase Error saving targets:", error);
            alert(`⚠️ Saved locally, but Supabase error: ${error.message}`);
            return;
          }
        } else {
          console.warn("User session missing. Saved to localStorage only.");
        }
      } catch (err) {
        console.error("Failed to save tracked targets to Supabase:", err.message);
        alert(`⚠️ Saved locally, but failed to reach Supabase: ${err.message}`);
        return;
      }
    }

    renderTrackedBadges();
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
    container.innerHTML = '<span class="text-xs text-sfl-woodLight italic">No items added to persistent tracking list yet.</span>';
    return;
  }

  window.trackedTargets.forEach((itemName, index) => {
    let cleanStr = String(itemName).replace(/^\[.*?\]\s*/, '').trim();
    let displayName = cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1);
    
    const badge = document.createElement('span');
    badge.className = 'inline-flex items-center gap-1.5 bg-sfl-gold/20 border border-sfl-gold text-sfl-dirt px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm';
    badge.innerHTML = `
      <span>${displayName}</span>
      <button type="button" class="text-sfl-accent hover:text-red-700 font-extrabold cursor-pointer ml-1" onclick="removeTrackedTarget(${index})">✕</button>
    `;
    container.appendChild(badge);
  });
}

export function removeTrackedTarget(index) {
  if (window.trackedTargets && window.trackedTargets[index] !== undefined) {
    window.trackedTargets.splice(index, 1);
    localStorage.setItem('sfl_tracked_targets', JSON.stringify(window.trackedTargets));
    renderTrackedBadges();
  }
}

window.renderTrackedBadges = renderTrackedBadges;
window.removeTrackedTarget = removeTrackedTarget;
window.openTrackingModal = function() {
  const modal = document.getElementById('tracking-modal');
  if (modal) {
    renderTrackedBadges();
    modal.classList.remove('hidden');
  }
};
