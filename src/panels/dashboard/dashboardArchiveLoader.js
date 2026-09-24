import { getCoinFlowerRatio } from '../../config/constants.js';

const archiveMemoryCache = new Map();

export async function fetchRollupArchive(bounds) {
  if (!bounds || (!bounds.monthKey && !bounds.minDateStr)) return null;

  const activeUser = window.currentUser;
  const farmId = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value?.trim() || '';
  const userId = activeUser?.id || '';

  const cacheKey = bounds.timeRange === 'month' 
    ? `m_${userId || farmId}_${bounds.monthKey}` 
    : `w_${userId || farmId}_${bounds.minDateStr}`;

  if (archiveMemoryCache.has(cacheKey)) {
    return archiveMemoryCache.get(cacheKey);
  }

  let record = null;
  const client = window.supabaseClient;

  // 1. Month Archive Lookup
  if (bounds.timeRange === 'month' && bounds.monthKey) {
    if (client && userId) {
      try {
        const { data, error } = await client
          .from('monthly_yields')
          .select('*')
          .eq('user_id', userId)
          .eq('month_key', bounds.monthKey)
          .maybeSingle();
        if (!error && data) record = data;
      } catch (_) {}
    }

    if (!record) {
      try {
        const backend = window.BACKEND_URL || '';
        const res = await fetch(`${backend}/api/monthly-yields?userId=${encodeURIComponent(userId)}&farmId=${encodeURIComponent(farmId)}&monthKey=${encodeURIComponent(bounds.monthKey)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          record = json.data.find(r => r.month_key === bounds.monthKey) || json.data[0];
        }
      } catch (_) {}
    }
  }

  // 2. Week Archive Lookup
  if ((bounds.timeRange === 'week' || bounds.timeRange === '7d') && bounds.minDateStr) {
    if (client && userId) {
      try {
        const { data, error } = await client
          .from('weekly_yields')
          .select('*')
          .eq('user_id', userId)
          .eq('week_start', bounds.minDateStr)
          .maybeSingle();
        if (!error && data) record = data;
      } catch (_) {}
    }

    if (!record) {
      try {
        const backend = window.BACKEND_URL || '';
        const res = await fetch(`${backend}/api/weekly-yields?userId=${encodeURIComponent(userId)}&farmId=${encodeURIComponent(farmId)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          record = json.data.find(r => (r.week_start || '').split('T')[0] === bounds.minDateStr);
        }
      } catch (_) {}
    }
  }

  if (record) {
    archiveMemoryCache.set(cacheKey, record);
  }

  return record;
}

export function convertArchiveToEarnedTotals(archive) {
  if (!archive) return {};
  const totals = {};
  const itemsMap = archive.items_summary || archive.earned_items || {};

  // If array format: [{name, qty, flowers}, ...]
  if (Array.isArray(itemsMap)) {
    itemsMap.forEach(item => {
      const name = item.name || item.crop || 'Item';
      if (name.startsWith('__')) return;
      const qty = parseFloat(item.qty || 0);
      const fl = parseFloat(item.flowers || 0);
      totals[name] = {
        qty,
        flowers: fl,
        grossFlowers: fl,
        taxAmount: 0
      };
    });
  } else if (typeof itemsMap === 'object') {
    // If dictionary format: { "Sunflower": [qty, flowers], ... }
    Object.entries(itemsMap).forEach(([name, val]) => {
      if (name.startsWith('__')) return;
      const qty = Array.isArray(val) ? parseFloat(val[0] || 0) : parseFloat(val?.qty || 0);
      const fl = Array.isArray(val) ? parseFloat(val[1] || 0) : parseFloat(val?.flowers || 0);
      totals[name] = {
        qty,
        flowers: fl,
        grossFlowers: fl,
        taxAmount: 0
      };
    });
  }

  // Include Coins Earned if recorded
  const coinsEarned = parseFloat(archive.coins_earned || archive.items_summary?.__currencies__?.coinsEarned || 0);
  if (coinsEarned > 0) {
    const ratio = getCoinFlowerRatio();
    const coinFlowers = parseFloat((coinsEarned / ratio).toFixed(3));
    totals['Coins'] = {
      qty: Math.round(coinsEarned),
      flowers: coinFlowers,
      grossFlowers: coinFlowers,
      taxAmount: 0
    };
  }

  return totals;
}

export function convertArchiveToSpentItems(archive) {
  if (!archive) return [];
  const spentList = [];

  const spentSource = archive.spent_summary || archive.spent_items || archive.items_summary?.__spent__ || {};

  if (Array.isArray(spentSource)) {
    spentSource.forEach(item => {
      const name = item.name || item.crop || 'Item';
      const qty = parseFloat(item.qty || 0);
      const fl = parseFloat(item.flowers || 0);
      if (qty > 0 || fl > 0) {
        spentList.push({ name, qty, flowers: fl });
      }
    });
  } else if (typeof spentSource === 'object') {
    Object.entries(spentSource).forEach(([name, val]) => {
      const qty = Array.isArray(val) ? parseFloat(val[0] || 0) : parseFloat(val?.qty || 0);
      const fl = Array.isArray(val) ? parseFloat(val[1] || 0) : parseFloat(val?.flowers || 0);
      if (qty > 0 || fl > 0) {
        spentList.push({ name, qty, flowers: fl });
      }
    });
  }

  // Add Coins Spent if not already present
  const coinsSpent = parseFloat(archive.coins_spent || archive.items_summary?.__currencies__?.coinsSpent || 0);
  if (coinsSpent > 0 && !spentList.some(i => i.name === 'Coins')) {
    const ratio = getCoinFlowerRatio();
    spentList.push({
      name: 'Coins',
      qty: Math.round(coinsSpent),
      flowers: parseFloat((coinsSpent / ratio).toFixed(3))
    });
  }

  // Add Gems Spent if not already present
  const gemsSpent = parseFloat(archive.gems_spent || archive.items_summary?.__currencies__?.gemsSpent || 0);
  if (gemsSpent > 0 && !spentList.some(i => i.name === 'Gems')) {
    spentList.push({
      name: 'Gems',
      qty: Math.round(gemsSpent),
      flowers: parseFloat((gemsSpent * 0.06408).toFixed(3))
    });
  }

  return spentList.sort((a, b) => b.flowers - a.flowers);
}
