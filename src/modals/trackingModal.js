import { SEARCH_EXCLUDED_KEYS } from '../config/constants.js';

window.trackedTargets = window.trackedTargets || [];

export function initTrackingModal() {
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

  // Target Item Combobox Search
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

  // Hydrate from localStorage if window.trackedTargets is empty
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
