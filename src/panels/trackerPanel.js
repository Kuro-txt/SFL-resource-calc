import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals, getBettyUnitPrice } from '../utils/formatters.js';
import { FLOWER_IMG_SMALL_HTML, getItemTaxRate, BACKEND_URL } from '../config/constants.js';

window.editingSnapshotDate = window.editingSnapshotDate || null;

export function initTrackerPanel() {
  updatePreHarvestUI();
  renderSnapshotHistory();
  loadCloudYieldHistory();
}

function getItemUnitPriceInFlowers(cleanName) {
  let cleanTarget = normalizeItemKey(cleanName);
  if (window.allPrices) {
    let matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanTarget);
    if (matchedKey) {
      let price = parseFloat(window.allPrices[matchedKey]) || 0;
      if (price > 0) return price > 100 ? price / 1000 : price;
    }
  }
  let betty = getBettyUnitPrice(cleanTarget);
  if (betty !== null && betty > 0) return betty;
  return 0.01;
}

export async function updatePreHarvestUI() {
  const mainContainer = document.getElementById('pre-harvest-status');
  const cloudStatus = document.getElementById('cloud-baseline-status');

  if (!mainContainer) return;

  let hasCloud = false;
  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const activeUser = window.currentUser;

  if (activeUser && client) {
    const todayDate = new Date().toISOString().split('T')[0];
    const { data } = await client
      .from('preharvest_baselines')
      .select('stock')
      .eq('user_id', activeUser.id)
      .eq('snapshot_date', todayDate)
      .maybeSingle();

    if (data && data.stock) {
      hasCloud = true;
      if (cloudStatus) cloudStatus.classList.remove('hidden');
    } else {
      if (cloudStatus) cloudStatus.classList.add('hidden');
    }
  } else {
    if (cloudStatus) cloudStatus.classList.add('hidden');
  }

  if (hasCloud) {
    mainContainer.classList.remove('hidden');
  } else {
    mainContainer.classList.add('hidden');
  }
}

export function getTrackedTargetKeys() {
  let targets = window.trackedTargets;
  if (!Array.isArray(targets) || targets.length === 0) {
    try {
      const rawLocal = localStorage.getItem('sfl_tracked_targets');
      if (rawLocal) targets = JSON.parse(rawLocal) || [];
    } catch (e) {}
  }
  if (!Array.isArray(targets)) targets = [];
  return new Set(targets.map(t => normalizeItemKey(t)).filter(Boolean));
}

export function renderSnapshotHistory() {
  const tbody = document.getElementById('snapshot-history-body');
  if (!tbody) return;

  const targetKeys = getTrackedTargetKeys();
  const hasTargets = targetKeys.size > 0;

  // Render / update active targets indicator if status container exists
  const targetsStatusBar = document.getElementById('tracker-targets-status-bar');
  if (targetsStatusBar) {
    if (hasTargets) {
      const targetPillsHtml = Array.from(targetKeys).map(k => {
        const displayName = k.charAt(0).toUpperCase() + k.slice(1);
        return `<span class="inline-flex items-center bg-amber-200/90 text-amber-950 border border-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">${displayName}</span>`;
      }).join(' ');

      targetsStatusBar.innerHTML = `
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-sfl-wood text-xs flex items-center gap-1">🎯 <span>Tracked Targets (${targetKeys.size}):</span></span>
          <div class="flex flex-wrap items-center gap-1">${targetPillsHtml}</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-sfl-woodLight font-semibold">Displaying only selected items</span>
          <button type="button" onclick="openTrackingModal()" class="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer">Edit Targets</button>
        </div>
      `;
      targetsStatusBar.classList.remove('hidden');
    } else {
      targetsStatusBar.innerHTML = `
        <div class="flex items-center justify-between w-full">
          <span class="text-xs text-sfl-woodLight italic">🎯 Showing all harvested items (No tracking targets set).</span>
          <button type="button" onclick="openTrackingModal()" class="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer">Select Targets</button>
        </div>
      `;
      targetsStatusBar.classList.remove('hidden');
    }
  }

  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch (err) {}

  const taxRate = parseFloat(document.getElementById('tax-select')?.value) || 0;

  if (!Array.isArray(history) || history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sfl-woodLight italic">No harvest sessions logged yet!</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  let renderedCount = 0;

  history.forEach(entry => {
    if (!entry) return;

    let entryDate = entry.date || entry.yield_date || 'Unknown Date';
    let isEditing = window.editingSnapshotDate === entryDate;
    let cleanDateId = entryDate.replace(/[^a-zA-Z0-9]/g, '');

    // Support both entry.crops and entry.cropActivityYields so items are ALWAYS displayed
    let rawCrops = entry.crops;
    if (typeof rawCrops === 'string') {
      try { rawCrops = JSON.parse(rawCrops); } catch(e) { rawCrops = []; }
    }
    let rawActs = entry.cropActivityYields || entry.crop_activity_yields;
    if (typeof rawActs === 'string') {
      try { rawActs = JSON.parse(rawActs); } catch(e) { rawActs = []; }
    }

    let cropsList = (Array.isArray(rawCrops) && rawCrops.length > 0)
      ? rawCrops
      : (Array.isArray(rawActs) ? rawActs.map(c => ({
          name: c.crop || c.name || 'Crop',
          qty: parseFloat(c.totalProduced || c.qty || c.harvestCount || 0),
          flowers: parseFloat(c.netFlowers || c.flowers || 0)
        })) : []);

    // Filter to ONLY items selected in targets if user has set targets
    if (hasTargets) {
      cropsList = cropsList.filter(c => {
        const cropName = c.name || c.item || c.crop || '';
        return targetKeys.has(normalizeItemKey(cropName));
      });
    }

    let rawTotalCount = parseFloat(entry.totalCount || entry.total_count);
    let totalYieldCount = hasTargets
      ? cropsList.reduce((acc, c) => acc + (parseFloat(c.qty) || 0), 0)
      : (!isNaN(rawTotalCount) ? rawTotalCount : cropsList.reduce((acc, c) => acc + (parseFloat(c.qty) || 0), 0));

    // Skip empty dummy rows with 0 harvests and no crops (e.g. inactive baseline days or no target items harvested)
    if (totalYieldCount <= 0 && cropsList.length === 0) return;

    let calculatedRowNetFlowers = 0;

    let cropBadges = cropsList
      .map((crop) => {
        const cropQty = parseFloat(crop.qty) || 0;
        let cropFlowers = parseFloat(crop.flowers) || 0;
        const cropName = crop.name || crop.item || 'Item';
        const cleanK = normalizeItemKey(cropName);

        let unitPrice = getItemUnitPriceInFlowers(cleanK);
        if (cropFlowers <= 0 || cropFlowers > (cropQty * 1.5) || unitPrice > 0) {
          const effectiveTax = getItemTaxRate(cropName, taxRate);
          cropFlowers = roundUpToThreeDecimals((unitPrice * cropQty) * (1 - effectiveTax));
        }

        calculatedRowNetFlowers += cropFlowers;

        if (isEditing) {
          return `
            <span class="inline-flex items-center gap-1 bg-amber-200 text-amber-900 border-2 border-sfl-green text-[11px] font-bold px-2 py-0.5 rounded shadow-sm mr-1 mb-1">
              <span>${cropName}:</span>
              <input type="number" id="edit-qty-${cleanDateId}-${cleanK}" value="${cropQty.toFixed(1)}" step="0.1" min="0" 
                class="w-12 sfl-input text-xs font-mono font-bold rounded px-1 text-sfl-dirt text-center">
            </span>
          `;
        } else {
          const tradeBought = parseFloat(crop.tradeBought || 0);
          const tradeSold = parseFloat(crop.tradeSold || 0);
          let tradeBadges = '';
          if (tradeBought > 0) {
            tradeBadges += `<span class="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold px-1.5 py-0.2 rounded shadow-2xs ml-0.5" title="${tradeBought.toFixed(1)} bought in P2P marketplace">🛒 +${tradeBought.toFixed(0)}</span>`;
          }
          if (tradeSold > 0) {
            tradeBadges += `<span class="bg-orange-100 text-orange-800 border border-orange-300 text-[10px] font-bold px-1.5 py-0.2 rounded shadow-2xs ml-0.5" title="${tradeSold.toFixed(1)} sold in P2P marketplace">🛒 -${tradeSold.toFixed(0)}</span>`;
          }

          return `
            <span class="inline-flex items-center gap-1 bg-green-100 text-sfl-green border border-sfl-green/40 text-[11px] font-bold px-2 py-0.5 rounded shadow-sm mr-1 mb-1">
              <span>+${cropQty.toFixed(1)} ${cropName}</span>
              <span class="text-sfl-green font-normal">(${cropFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML})</span>
              ${tradeBadges}
            </span>
          `;
        }
      })
      .join('');

    let coinsEntry = (Array.isArray(rawActs) ? rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) : null) || entry.coins;
    let coinsHtml = '';
    if (coinsEntry) {
      const netCoins = parseFloat(coinsEntry.netCoins || coinsEntry.net || 0);
      const earned = parseFloat(coinsEntry.coinsEarned || coinsEntry.earned || 0);
      const spent = parseFloat(coinsEntry.coinsSpent || coinsEntry.spent || 0);
      if (Math.abs(netCoins) > 0 || earned > 0 || spent > 0) {
        const netSign = netCoins >= 0 ? '+' : '';
        const netColor = netCoins >= 0 ? 'text-amber-800 bg-amber-100/90 border-amber-300' : 'text-red-800 bg-red-100/90 border-red-300';
        coinsHtml = `
          <div class="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-bold ${netColor} shadow-2xs">
              <span>🪙</span>
              <span>${netSign}${Math.round(netCoins).toLocaleString()} Coins</span>
            </span>
            ${earned > 0 ? `<span class="text-green-700 font-semibold">(+${Math.round(earned).toLocaleString()} earned</span>` : ''}
            ${spent > 0 ? `<span class="text-orange-700 font-semibold">${earned > 0 ? ',' : '('}-${Math.round(spent).toLocaleString()} spent)</span>` : (earned > 0 ? `<span class="text-green-700 font-semibold">)</span>` : '')}
          </div>
        `;
      }
    }

    let actionButtons = isEditing 
      ? `
        <button onclick="saveEditedSnapshot('${entryDate}')" class="bg-sfl-green text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-green-700 mr-1 shadow-sm cursor-pointer">💾 Save</button>
        <button onclick="cancelEditSnapshot()" class="bg-sfl-wood text-amber-200 px-2 py-1 rounded text-[10px] font-bold hover:bg-sfl-woodLight shadow-sm cursor-pointer">✕</button>
      `
      : `
        <button onclick="editSnapshotRow('${entryDate}')" class="bg-amber-600 text-amber-100 px-2 py-1 rounded text-[10px] font-bold hover:bg-amber-700 mr-1 shadow-sm cursor-pointer">✏️ Edit</button>
        <button onclick="deleteSnapshotRow('${entryDate}')" class="bg-sfl-accent text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-700 shadow-sm cursor-pointer">🗑️</button>
      `;

    let recordedNet = parseFloat(entry.netFlowers || entry.net_flowers || 0);
    let finalNetFlowers = hasTargets
      ? calculatedRowNetFlowers
      : (calculatedRowNetFlowers > 0 ? calculatedRowNetFlowers : (recordedNet < 500 ? recordedNet : 0));

    let tr = document.createElement('tr');
    tr.className = isEditing ? "bg-amber-100/70 transition" : "hover:bg-amber-50/50 transition";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold whitespace-nowrap">${entryDate}</td>
      <td class="px-3 py-2.5 font-bold font-mono text-sfl-wood">${totalYieldCount.toFixed(1)} Items</td>
      <td class="px-3 py-2.5">
        ${cropBadges || '<span class="italic text-gray-400">No target items harvested</span>'}
        ${coinsHtml}
      </td>
      <td class="px-3 py-2.5 font-bold text-sfl-green font-mono">${finalNetFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      <td class="px-2 py-2.5 text-center whitespace-nowrap">${actionButtons}</td>
    `;
    tbody.appendChild(tr);
    renderedCount++;
  });

  if (renderedCount === 0) {
    if (hasTargets) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sfl-woodLight italic">No harvest sessions found matching your selected targets.</td></tr>`;
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-sfl-woodLight italic">No harvest sessions logged yet!</td></tr>`;
    }
  }
}

export function editSnapshotRow(date) {
  window.editingSnapshotDate = date;
  renderSnapshotHistory();
}

export function cancelEditSnapshot() {
  window.editingSnapshotDate = null;
  renderSnapshotHistory();
}

export async function saveEditedSnapshot(date) {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch(e) { return; }

  let entryIndex = history.findIndex(item => item.date === date);
  if (entryIndex === -1) return;

  const taxRate = parseFloat(document.getElementById('tax-select')?.value) || 0;
  let entry = history[entryIndex];
  let updatedCrops = [];
  let grandTotalCount = 0;
  let grandNetFlowers = 0;

  if (Array.isArray(entry.crops)) {
    entry.crops.forEach((crop) => {
      let cleanDateId = date.replace(/[^a-zA-Z0-9]/g, '');
      let cleanK = normalizeItemKey(crop.name || crop.item || '');
      let inputEl = document.getElementById(`edit-qty-${cleanDateId}-${cleanK}`);
      let newQty = inputEl ? roundUpToOneDecimal(parseFloat(inputEl.value) || 0) : (parseFloat(crop.qty) || 0);

      if (newQty > 0) {
        let unitPrice = getItemUnitPriceInFlowers(cleanK);
        const effectiveTax = getItemTaxRate(crop.name || crop.item || '', taxRate);
        let itemNetFlowers = roundUpToThreeDecimals((unitPrice * newQty) * (1 - effectiveTax));

        updatedCrops.push({
          ...crop,
          name: crop.name || crop.item || 'Crop',
          qty: newQty,
          flowers: itemNetFlowers
        });

        grandTotalCount += newQty;
        grandNetFlowers += itemNetFlowers;
      }
    });
  }

  if (updatedCrops.length === 0) {
    deleteSnapshotRow(date);
    return;
  }

  history[entryIndex] = {
    ...entry,
    date: date,
    totalCount: roundUpToOneDecimal(grandTotalCount),
    crops: updatedCrops,
    netFlowers: roundUpToThreeDecimals(grandNetFlowers).toFixed(3)
  };

  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const activeUser = window.currentUser;

  if (activeUser && client) {
    await client.from('daily_yields').upsert({
      user_id: activeUser.id,
      yield_date: date,
      total_count: roundUpToOneDecimal(grandTotalCount),
      net_flowers: roundUpToThreeDecimals(grandNetFlowers),
      crops: updatedCrops
    }, { onConflict: 'user_id,yield_date' });

    syncWeeklyYieldForDate(activeUser.id, date).catch(() => {});
  }

  localStorage.setItem('sfl_daily_snapshots', JSON.stringify(history));
  window.editingSnapshotDate = null;
  renderSnapshotHistory();
  alert(`✅ Harvest record for ${date} updated!`);
}

export async function deleteSnapshotRow(date) {
  if (!confirm(`Delete snapshot record for ${date}?`)) return;
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
  } catch(e) { history = []; }

  localStorage.setItem('sfl_daily_snapshots', JSON.stringify(history.filter(i => (i.date || i.yield_date) !== date)));

  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const activeUser = window.currentUser;

  if (activeUser && client) {
    await client.from('daily_yields').delete().eq('user_id', activeUser.id).eq('yield_date', date);
    syncWeeklyYieldForDate(activeUser.id, date).catch(() => {});
  }

  if (window.editingSnapshotDate === date) window.editingSnapshotDate = null;
  renderSnapshotHistory();
}

export async function syncWeeklyYieldForDate(userId, date) {
  if (!userId || !date) return;
  const backend = window.BACKEND_URL || '';
  try {
    await fetch(`${backend}/api/weekly-yields/recalc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, date })
    });
    // Bust the weekly modal cache so the next open re-fetches fresh data
    if (typeof window.invalidateWeeklyArchiveCache === 'function') {
      window.invalidateWeeklyArchiveCache();
    }
  } catch(e) {
    console.warn("Weekly sync notice:", e.message);
  }
}

let lastYieldFetchTime = 0;

export async function loadCloudYieldHistory(force = false) {
  if (!force && (Date.now() - lastYieldFetchTime < 180000)) {
    renderSnapshotHistory();
    return;
  }
  lastYieldFetchTime = Date.now();

  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const activeUser = window.currentUser;
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim() || '';

  let cloudYields = [];

  if (client && (activeUser?.id || farmId)) {
    try {
      let targetUserId = activeUser?.id;
      if (!targetUserId && farmId) {
        const { data: profile } = await client
          .from('profiles')
          .select('id')
          .eq('farm_id', farmId)
          .maybeSingle();
        if (profile?.id) targetUserId = profile.id;
      }

      if (targetUserId) {
        const { data, error } = await client
          .from('daily_yields')
          .select('*')
          .eq('user_id', targetUserId)
          .gt('total_count', 0)
          .order('yield_date', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          cloudYields = data;
        }
      }
    } catch (err) {
      console.warn("Supabase yield fetch notice:", err.message);
    }
  }

  // Fallback to Backend /api/yields endpoint (backed by Supabase)
  if (cloudYields.length === 0 && (farmId || activeUser?.id)) {
    try {
      const url = `${BACKEND_URL}/api/yields?farmId=${encodeURIComponent(farmId)}&userId=${encodeURIComponent(activeUser?.id || '')}${force ? `&_t=${Date.now()}` : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        cloudYields = json.data;
      }
    } catch (err) {
      console.warn("Backend /api/yields fetch notice:", err.message);
    }
  }

  if (cloudYields.length > 0) {
    let existingLocal = [];
    try {
      existingLocal = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
    } catch(e) { existingLocal = []; }

    const cutoff90 = new Date();
    cutoff90.setDate(cutoff90.getDate() - 90);
    const cutoff90Str = cutoff90.toISOString().split('T')[0];

    const mergedMap = new Map();
    // 1. Keep existing local records within 90-day retention window (3 months)
    if (Array.isArray(existingLocal)) {
      existingLocal.forEach(item => {
        const d = item.date || item.yield_date;
        if (d && d >= cutoff90Str) mergedMap.set(d, item);
      });
    }

    // 2. Overlay cloud yields within 90-day window (3 months)
    cloudYields.forEach(item => {
      const d = item.yield_date || item.date;
      if (!d || d < cutoff90Str) return;

      const existing = mergedMap.get(d) || {};
      let cloudCrops = Array.isArray(item.crops) ? item.crops : [];
      if (typeof item.crops === 'string') {
        try { cloudCrops = JSON.parse(item.crops); } catch(e) { cloudCrops = []; }
      }

      let cloudActs = Array.isArray(item.crop_activity_yields) ? item.crop_activity_yields : (item.cropActivityYields || []);
      if (typeof cloudActs === 'string') {
        try { cloudActs = JSON.parse(cloudActs); } catch(e) { cloudActs = []; }
      }

      const spentAct = cloudActs.find(a => a && a.type === 'spent');
      const spentItems = (spentAct && Array.isArray(spentAct.items)) ? spentAct.items : (existing.spent || []);
      const totalSpentCount = spentAct ? parseFloat(spentAct.totalSpentCount || 0) : parseFloat(existing.totalSpentCount || 0);
      const totalSpentFlowers = spentAct ? parseFloat(spentAct.totalSpentFlowers || 0) : parseFloat(existing.totalSpentFlowers || 0);

      const gemsAct = cloudActs.find(a => a && a.type === 'gems');

      let effectiveCrops = cloudCrops;
      if (effectiveCrops.length === 0 && cloudActs.length > 0) {
        effectiveCrops = cloudActs
          .filter(c => c && c.type !== 'spent' && c.type !== 'coins' && c.type !== 'gems')
          .map(c => ({
            name: c.crop || c.name || 'Crop',
            qty: parseFloat(c.totalProduced || c.qty || c.harvestCount || 0),
            flowers: parseFloat(c.netFlowers || c.flowers || 0)
          }));
      }

      if (effectiveCrops.length === 0 && Array.isArray(existing.crops) && existing.crops.length > 0) {
        effectiveCrops = existing.crops;
      }

      const totalCount = parseFloat(item.total_count || item.totalCount || existing.totalCount || 0);

      // Skip 0-yield blank days with no crops, no spent items, and no gems activity
      if (totalCount <= 0 && effectiveCrops.length === 0 && spentItems.length === 0 && !gemsAct) return;

      mergedMap.set(d, {
        date: d,
        totalCount: totalCount,
        crops: effectiveCrops,
        spent: spentItems,
        gems: gemsAct || existing.gems || null,
        totalSpentCount: totalSpentCount,
        totalSpentFlowers: totalSpentFlowers,
        cropActivityYields: cloudActs.length > 0 ? cloudActs : (existing.cropActivityYields || []),
        netFlowers: parseFloat(item.net_flowers || item.netFlowers || existing.netFlowers || 0).toFixed(3)
      });
    });

    const finalHistory = Array.from(mergedMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    localStorage.setItem('sfl_daily_snapshots', JSON.stringify(finalHistory));
    renderSnapshotHistory();
    if (typeof window.refreshDashboardView === 'function') {
      window.refreshDashboardView();
    }
    return finalHistory;
  }
  return [];
}

window.editSnapshotRow = editSnapshotRow;
window.cancelEditSnapshot = cancelEditSnapshot;
window.saveEditedSnapshot = saveEditedSnapshot;
window.deleteSnapshotRow = deleteSnapshotRow;
window.renderSnapshotHistory = renderSnapshotHistory;
window.updatePreHarvestUI = updatePreHarvestUI;
window.loadCloudYieldHistory = loadCloudYieldHistory;
