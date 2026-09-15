// ─── Deliveries Section ───────────────────────────────────────────────────────
// Reads window.farmData.bumpkin.activity for NPC delivery counters + coins/flowers.

import { PanelManager } from '../../services/panelManager.js';

// All known NPCs that give delivery rewards
const NPC_EMOJIS = {
  'mia': '👧', 'pam': '👩', 'grimbly': '👺', 'grimtooth': '🦷',
  'betty': '👵', 'raven': '🐦', 'blacksmith': '⚒️', 'bert': '🧔',
  'finley': '🐟', 'finn': '🎣', 'jester': '🃏', 'peggy': '🐷',
  'tywin': '🧙', 'cornwell': '🌽', 'corale': '🦀', 'miranda': '🌸',
  'sid': '🎨', 'victoria': '👑', 'santa': '🎅', 'timmy': '🐑',
  'rowan': '🌳', 'gordo': '🪨', 'woodlands': '🌲', 'mayor': '🏛️',
};

function getNpcEmoji(name) {
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  return NPC_EMOJIS[key] || '🧑';
}

export function parseDeliveries(farmData) {
  if (!farmData) return { deliveries: [], totalCoins: 0, totalFlowers: 0 };

  const root = farmData.farm || farmData.data || farmData;
  const activity = {
    ...(root.bumpkin?.activity || {}),
    ...(root.activity || {}),
    ...(root.farmActivity || {}),
  };

  // Keys like "Mia Delivered", "Pam Delivered", etc.
  const deliveryEntries = Object.entries(activity)
    .filter(([k]) => /\bdelivered\b/i.test(k))
    .map(([k, count]) => {
      const npcName = k.replace(/\s*delivered\s*/i, '').trim();
      return { npc: npcName, count: parseInt(count) || 0 };
    })
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);

  // Coins balance
  const coins = parseFloat(root.coins || root.balance || 0);

  // Flower balance
  const flowers = parseFloat(root.flowers || root.flower || 0);

  return { deliveries: deliveryEntries, totalCoins: coins, totalFlowers: flowers };
}

export function renderDeliveriesSection(mountEl) {
  if (!mountEl) return;

  const farmData = window.farmData || window.currentFarmData;
  if (!farmData) {
    mountEl.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-bold text-sfl-wood uppercase tracking-wide">🎁 Deliveries & Balance</h4>
      </div>
      <p class="text-xs text-sfl-woodLight italic text-center py-2">Farm data not loaded. Enter your Farm ID and load data first.</p>`;
    return;
  }

  const { deliveries, totalCoins, totalFlowers } = parseDeliveries(farmData);

  const deliveryHtml = deliveries.length === 0
    ? `<p class="text-xs text-sfl-woodLight italic text-center py-2">No deliveries found in farm activity.</p>`
    : deliveries.slice(0, 8).map(({ npc, count }) => `
        <div class="flex items-center justify-between text-[11px] py-1 border-b border-amber-100 last:border-0">
          <span class="font-bold text-sfl-dirt">${getNpcEmoji(npc)} ${npc}</span>
          <span class="font-mono text-sfl-wood">${count}× deliveries</span>
        </div>`).join('');

  let latestCoinsStats = null;
  try {
    const history = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        const rawActs = h.cropActivityYields || h.crop_activity_yields || [];
        const found = (Array.isArray(rawActs) ? rawActs.find(a => a && (a.type === 'coins' || a.crop === 'Coins')) : null) || h.coins;
        if (found) {
          latestCoinsStats = found;
          break;
        }
      }
    }
  } catch (_) {}

  const coinSubtext = latestCoinsStats ? `
    <p class="text-[9px] font-mono font-bold ${parseFloat(latestCoinsStats.netCoins || latestCoinsStats.net || 0) >= 0 ? 'text-green-700' : 'text-red-600'}">
      ${parseFloat(latestCoinsStats.netCoins || latestCoinsStats.net || 0) >= 0 ? '+' : ''}${Math.round(parseFloat(latestCoinsStats.netCoins || latestCoinsStats.net || 0)).toLocaleString()} today
    </p>` : '';

  mountEl.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-xs font-bold text-sfl-wood uppercase tracking-wide">🎁 Deliveries & Balance</h4>
      <button id="dash-goto-npc" class="text-[10px] font-bold text-sfl-wood underline cursor-pointer hover:text-sfl-dirt">NPC Panel →</button>
    </div>
    <div class="grid grid-cols-2 gap-2 text-center mb-3">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase">Coins</p>
        <p class="font-mono font-bold text-yellow-600 text-sm">${totalCoins.toLocaleString()}</p>
        ${coinSubtext}
      </div>
      <div class="bg-pink-50 border border-pink-200 rounded-lg p-2">
        <p class="text-[10px] text-sfl-woodLight font-bold uppercase">Flowers</p>
        <p class="font-mono font-bold text-pink-600 text-sm">${totalFlowers.toFixed(3)}</p>
      </div>
    </div>
    <p class="text-[10px] font-bold text-sfl-woodLight uppercase tracking-wide mb-1">NPC Deliveries (All Time)</p>
    <div class="space-y-0">${deliveryHtml}</div>
    <p class="text-[10px] text-sfl-woodLight italic mt-2">Delivery counts are cumulative totals from the farm API.</p>`;

  document.getElementById('dash-goto-npc')?.addEventListener('click', () => PanelManager.switch('npc'));
}
