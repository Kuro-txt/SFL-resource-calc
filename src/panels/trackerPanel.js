import { normalizeItemKey, roundUpToOneDecimal, roundUpToThreeDecimals } from '../utils/formatters.js';
import { FLOWER_IMG_SMALL_HTML } from '../config/constants.js';

window.editingSnapshotDate = window.editingSnapshotDate || null;

export function initTrackerPanel() {
  updatePreHarvestUI();
  renderSnapshotHistory();
  loadCloudYieldHistory();
}

function getItemUnitPriceInFlowers(cleanName) {
  if (!window.allPrices) return 0;
  let cleanTarget = normalizeItemKey(cleanName);
  let matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanTarget);
  if (!matchedKey) return 0;

  let price = parseFloat(window.allPrices[matchedKey]) || 0;
  return price > 100 ? price / 1000 : price;
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

export function renderSnapshotHistory() {
  const tbody = document.getElementById('snapshot-history-body');
  if (!tbody) return;

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
  history.forEach(entry => {
    if (!entry) return;

    let entryDate = entry.date || entry.yield_date || 'Unknown Date';
    let isEditing = window.editingSnapshotDate === entryDate;
    let cleanDateId = entryDate.replace(/[^a-zA-Z0-9]/g, '');

    let cropsList = Array.isArray(entry.crops) ? entry.crops : [];
    let calculatedRowNetFlowers = 0;

    let cropBadges = cropsList
      .map((crop, idx) => {
        const cropQty = parseFloat(crop.qty) || 0;
        let cropFlowers = parseFloat(crop.flowers) || 0;
        const cropName = crop.name || crop.item || 'Item';
        const cleanK = normalizeItemKey(cropName);

        if ((cropFlowers <= 0 || cropFlowers > 500) && cropQty > 0) {
          let unitPrice = getItemUnitPriceInFlowers(cleanK);
          cropFlowers = roundUpToThreeDecimals((unitPrice * cropQty) * (1 - taxRate));
        }

        calculatedRowNetFlowers += cropFlowers;

        if (isEditing) {
          return `
            <span class="inline-flex items-center gap-1 bg-amber-200 text-amber-900 border-2 border-sfl-green text-[11px] font-bold px-2 py-0.5 rounded shadow-sm mr-1 mb-1">
              <span>${cropName}:</span>
              <input type="number" id="edit-qty-${cleanDateId}-${idx}" value="${cropQty.toFixed(1)}" step="0.1" min="0" 
                class="w-12 sfl-input text-xs font-mono font-bold rounded px-1 text-sfl-dirt text-center">
            </span>
          `;
        } else {
          return `
            <span class="inline-flex items-center gap-1 bg-green-100 text-sfl-green border border-sfl-green/40 text-[11px] font-bold px-2 py-0.5 rounded shadow-sm mr-1 mb-1">
              <span>+${cropQty.toFixed(1)} ${cropName}</span>
              <span class="text-sfl-green font-normal">(${cropFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML})</span>
            </span>
          `;
        }
      })
      .join('');

    let actionButtons = isEditing 
      ? `
        <button onclick="saveEditedSnapshot('${entryDate}')" class="bg-sfl-green text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-green-700 mr-1 shadow-sm cursor-pointer">💾 Save</button>
        <button onclick="cancelEditSnapshot()" class="bg-sfl-wood text-amber-200 px-2 py-1 rounded text-[10px] font-bold hover:bg-sfl-woodLight shadow-sm cursor-pointer">✕</button>
      `
      : `
        <button onclick="editSnapshotRow('${entryDate}')" class="bg-amber-600 text-amber-100 px-2 py-1 rounded text-[10px] font-bold hover:bg-amber-700 mr-1 shadow-sm cursor-pointer">✏️ Edit</button>
        <button onclick="deleteSnapshotRow('${entryDate}')" class="bg-sfl-accent text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-700 shadow-sm cursor-pointer">🗑️</button>
      `;

    let rawTotalCount = parseFloat(entry.totalCount || entry.total_count);
    let totalYieldCount = !isNaN(rawTotalCount) 
      ? rawTotalCount 
      : cropsList.reduce((acc, c) => acc + (parseFloat(c.qty) || 0), 0);

    let finalNetFlowers = calculatedRowNetFlowers;

    let tr = document.createElement('tr');
    tr.className = isEditing ? "bg-amber-100/70 transition" : "hover:bg-amber-50/50 transition";
    tr.innerHTML = `
      <td class="px-3 py-2.5 font-bold whitespace-nowrap">${entryDate}</td>
      <td class="px-3 py-2.5 font-bold font-mono text-sfl-wood">${totalYieldCount.toFixed(1)} Items</td>
      <td class="px-3 py-2.5">${cropBadges || '<span class="italic text-gray-400">No details</span>'}</td>
      <td class="px-3 py-2.5 font-bold text-sfl-green font-mono">${finalNetFlowers.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</td>
      <td class="px-2 py-2.5 text-center whitespace-nowrap">${actionButtons}</td>
    `;
    tbody.appendChild(tr);
  });
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
    entry.crops.forEach((crop, cropIdx) => {
      let cleanDateId = date.replace(/[^a-zA-Z0-9]/g, '');
      let inputEl = document.getElementById(`edit-qty-${cleanDateId}-${cropIdx}`);
      let newQty = inputEl ? roundUpToOneDecimal(parseFloat(inputEl.value) || 0) : (parseFloat(crop.qty) || 0);

      if (newQty > 0) {
        let cleanK = normalizeItemKey(crop.name || crop.item || '');
        let unitPrice = getItemUnitPriceInFlowers(cleanK);
        let itemNetFlowers = roundUpToThreeDecimals((unitPrice * newQty) * (1 - taxRate));

        updatedCrops.push({
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
  }

  if (window.editingSnapshotDate === date) window.editingSnapshotDate = null;
  renderSnapshotHistory();
}

export async function loadCloudYieldHistory() {
  const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
  const activeUser = window.currentUser;
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value.trim() || '';

  let cloudYields = [];

  if (activeUser && client) {
    try {
      const { data, error } = await client
        .from('daily_yields')
        .select('*')
        .eq('user_id', activeUser.id)
        .order('yield_date', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        cloudYields = data;
      }
    } catch (err) {
      console.warn("Supabase yield fetch notice:", err.message);
    }
  }

  // Fallback to TiDB Cloud API (immune to Supabase RLS restrictions)
  if (cloudYields.length === 0 && (farmId || activeUser?.id)) {
    try {
      const backend = window.BACKEND_URL || '';
      const url = `${backend}/api/yields?farmId=${encodeURIComponent(farmId)}&userId=${encodeURIComponent(activeUser?.id || '')}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        cloudYields = json.data;
      }
    } catch (err) {
      console.warn("TiDB yield fallback notice:", err.message);
    }
  }

  if (cloudYields.length > 0) {
    const cloudHistory = cloudYields.map(item => ({
      date: item.yield_date || item.date,
      totalCount: parseFloat(item.total_count || item.totalCount || 0),
      crops: item.crops || [],
      cropActivityYields: item.crop_activity_yields || item.cropActivityYields || [],
      netFlowers: parseFloat(item.net_flowers || item.netFlowers || 0).toFixed(3)
    }));
    localStorage.setItem('sfl_daily_snapshots', JSON.stringify(cloudHistory));
    renderSnapshotHistory();
  }
}

window.editSnapshotRow = editSnapshotRow;
window.cancelEditSnapshot = cancelEditSnapshot;
window.saveEditedSnapshot = saveEditedSnapshot;
window.deleteSnapshotRow = deleteSnapshotRow;
window.renderSnapshotHistory = renderSnapshotHistory;
window.updatePreHarvestUI = updatePreHarvestUI;
