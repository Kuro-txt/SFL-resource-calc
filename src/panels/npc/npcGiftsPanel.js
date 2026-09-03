import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../../utils/formatters.js';
import { NPC_CATALOG } from './npcData.js';
import { getNpcFriendship, getItemFlowerPrice, calculateMilestoneProgress } from './npcLogic.js';

let activeLocationFilter = 'all';
let favoriteNpcIds = new Set(JSON.parse(localStorage.getItem('sfl_favorite_npcs') || '[]'));
let hasBlossomBonding = localStorage.getItem('sfl_blossom_bonding') === 'true';

export function toggleFavoriteNpc(npcId) {
  if (favoriteNpcIds.has(npcId)) {
    favoriteNpcIds.delete(npcId);
  } else {
    favoriteNpcIds.add(npcId);
  }
  localStorage.setItem('sfl_favorite_npcs', JSON.stringify(Array.from(favoriteNpcIds)));
  renderNpcCards();
}
window.toggleFavoriteNpc = toggleFavoriteNpc;

export function renderNpcGiftsTemplate() {
  const container = document.getElementById('npc-gifts-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-5">
      <!-- HEADER & CONTROLS -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>🎁</span> NPC Gift & Friendship Tracker
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            Track live friendship points, milestone rewards, and required flowers.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- BLOSSOM BONDING SKILL TOGGLE (+2 PTS) -->
          <label class="flex items-center gap-1.5 bg-pink-100/90 dark:bg-pink-950/40 border border-pink-300 dark:border-pink-800 px-2.5 py-1 rounded-lg shadow-xs cursor-pointer select-none">
            <input type="checkbox" id="blossom-bonding-toggle" ${hasBlossomBonding ? 'checked' : ''} class="w-3.5 h-3.5 text-pink-600 rounded border-pink-400 focus:ring-0 cursor-pointer">
            <span class="text-[11px] font-bold text-pink-900 dark:text-pink-300 whitespace-nowrap">🌸 Blossom Bonding (+2)</span>
          </label>

          <!-- SEARCH -->
          <input type="text" id="npc-search-input" placeholder="Search NPC or Flower..." class="sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt w-full sm:w-40 focus:ring-1 focus:ring-sfl-gold">

          <!-- LOCATION FILTER -->
          <select id="npc-location-filter" class="sfl-input rounded-lg px-2 py-1 text-xs font-bold text-sfl-dirt cursor-pointer">
            <option value="all">📍 All Locations</option>
            <option value="Plaza">Plaza</option>
            <option value="Beach">Beach</option>
            <option value="Kingdom">Kingdom</option>
          </select>
        </div>
      </div>

      <!-- OVERVIEW METRICS -->
      <div class="bg-sfl-gold/20 border-2 border-sfl-gold rounded-xl p-4 shadow-inner">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center items-center">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">NPCs Tracked</span>
            <h2 id="npc-total-count" class="text-xl sm:text-2xl font-pixel font-bold text-sfl-dirt mt-0.5">14</h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-gold block">⭐ Favorited</span>
            <h2 id="npc-favorited-count" class="text-xl sm:text-2xl font-pixel font-bold text-amber-700 mt-0.5">0</h2>
          </div>
        </div>
      </div>

      <!-- NPC CARDS GRID -->
      <div id="npc-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"></div>
    </div>
  `;
}

export function initNpcGiftsPanel() {
  renderNpcGiftsTemplate();
  renderNpcCards();

  document.getElementById('npc-search-input')?.addEventListener('input', renderNpcCards);
  document.getElementById('npc-location-filter')?.addEventListener('change', (e) => {
    activeLocationFilter = e.target.value;
    renderNpcCards();
  });

  document.getElementById('blossom-bonding-toggle')?.addEventListener('change', (e) => {
    hasBlossomBonding = e.target.checked;
    localStorage.setItem('sfl_blossom_bonding', hasBlossomBonding ? 'true' : 'false');
    renderNpcCards();
  });
}

export function renderNpcCards() {
  const grid = document.getElementById('npc-cards-grid');
  if (!grid) return;

  const liveNpcData = window.farmNpcData || JSON.parse(localStorage.getItem('sfl_farm_npcs') || '{}');
  const query = document.getElementById('npc-search-input')?.value.toLowerCase().trim() || '';
  const filter = activeLocationFilter;

  const fullNpcList = NPC_CATALOG;

  const filteredNpcs = fullNpcList.filter(npc => {
    const matchesLoc = filter === 'all' || npc.location.toLowerCase() === filter.toLowerCase();
    const matchesQuery = !query || 
      npc.name.toLowerCase().includes(query) || 
      npc.favorites.some(f => (typeof f === 'string' ? f : f.name).toLowerCase().includes(query));
    return matchesLoc && matchesQuery;
  });

  filteredNpcs.sort((a, b) => {
    const aFav = favoriteNpcIds.has(a.id);
    const bFav = favoriteNpcIds.has(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  const countEl = document.getElementById('npc-total-count');
  const favEl = document.getElementById('npc-favorited-count');

  if (countEl) countEl.textContent = `${fullNpcList.length} NPCs`;
  if (favEl) favEl.textContent = `${favoriteNpcIds.size}`;

  if (filteredNpcs.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-sfl-woodLight italic">No NPCs found matching your criteria.</div>`;
    return;
  }

  grid.innerHTML = '';

  filteredNpcs.forEach(npc => {
    const isFav = favoriteNpcIds.has(npc.id);
    const friendship = getNpcFriendship(npc.id, liveNpcData);
    const points = parseInt(friendship.points || 0, 10);
    const claimedAt = parseInt(friendship.giftClaimedAtPoints || 0, 10);
    const unclaimed = Math.max(0, points - claimedAt);

    const progress = calculateMilestoneProgress(npc, points);

    const favoritesHtml = npc.favorites.map(item => {
      const favName = typeof item === 'string' ? item : item.name;
      const basePts = typeof item === 'object' && typeof item.pts === 'number' ? item.pts : 0;
      const effectivePts = basePts + (hasBlossomBonding ? 2 : 0);

      const flowersNeeded = (progress.pointsNeeded > 0 && effectivePts > 0)
        ? Math.ceil(progress.pointsNeeded / effectivePts)
        : 0;

      const cleanKey = normalizeItemKey(favName);
      const price = getItemFlowerPrice(cleanKey);
      const priceBadge = price > 0
        ? `<span class="text-[10px] text-sfl-green font-mono font-bold flex items-center gap-0.5">${price.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>`
        : '';

      return `
        <div class="flex justify-between items-center bg-amber-100/70 dark:bg-amber-950/40 px-2.5 py-1.5 rounded text-xs gap-2">
          <div class="flex items-center gap-1.5 overflow-hidden">
            <span class="font-bold text-sfl-dirt truncate">${favName}</span>
            <span class="text-[10px] font-mono font-extrabold text-amber-800 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded shrink-0">
              ${effectivePts} pts
            </span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            ${progress.pointsNeeded > 0 ? `
              <span class="text-[10px] font-mono font-bold bg-amber-200/90 dark:bg-amber-900/50 text-sfl-wood dark:text-amber-200 px-1.5 py-0.5 rounded border border-amber-300/80 dark:border-amber-700">
                ${flowersNeeded} needed
              </span>
            ` : ''}
            ${priceBadge}
          </div>
        </div>
      `;
    }).join('');

    const card = document.createElement('div');
    card.className = `p-3.5 rounded-xl border-2 transition shadow-sm space-y-3 relative ${
      isFav ? 'ring-2 ring-sfl-gold/60' : ''
    } bg-white/90 dark:bg-amber-950/30 border-sfl-cardBorder`;

    card.innerHTML = `
      <!-- TOP HEADER -->
      <div class="flex justify-between items-center border-b border-sfl-cardBorder/40 pb-2">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${npc.icon}</span>
          <div>
            <div class="flex items-center gap-1.5">
              <h4 class="font-bold text-sfl-dirt text-sm">${npc.name}</h4>
              <button onclick="toggleFavoriteNpc('${npc.id}')" title="${isFav ? 'Remove Favorite' : 'Favorite NPC'}" class="text-xs transition-transform hover:scale-125 cursor-pointer leading-none">
                ${isFav ? '⭐' : '☆'}
              </button>
            </div>
            <span class="text-[10px] text-sfl-woodLight font-semibold">📍 ${npc.location}</span>
          </div>
        </div>
      </div>

      <!-- FRIENDSHIP POINTS & CLAIM STATS -->
      <div class="grid grid-cols-3 gap-1.5 bg-amber-900/10 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-600/20 text-center font-mono">
        <div>
          <span class="text-[9px] font-bold text-sfl-wood uppercase block">Total Pts</span>
          <span class="text-xs font-black text-sfl-dirt">${points}</span>
        </div>
        <div class="border-l border-amber-600/20 px-1">
          <span class="text-[9px] font-bold text-sfl-wood uppercase block">Last Claim</span>
          <span class="text-xs font-bold text-sfl-woodLight">${claimedAt} pts</span>
        </div>
        <div class="border-l border-amber-600/20 px-1">
          <span class="text-[9px] font-bold text-sfl-green uppercase block">Unclaimed</span>
          <span class="text-xs font-black ${unclaimed > 0 ? 'text-sfl-green font-extrabold' : 'text-sfl-woodLight'}">+${unclaimed}</span>
        </div>
      </div>

      <!-- MILESTONE PROGRESS BAR WITH EXACT REWARD NAME -->
      <div class="bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-700/40 rounded-lg p-2.5 space-y-1.5">
        <div class="flex justify-between items-center text-[11px] font-bold font-mono">
          <span class="text-sfl-wood dark:text-amber-300">
            ${progress.isRecurring ? '🔄 Recurring Reward' : '🎯 Next Reward'}
          </span>
          <span class="text-sfl-dirt dark:text-amber-100 font-extrabold">
            ${progress.currentInTier} / ${progress.tierTotal} pts (${progress.percentage}%)
          </span>
        </div>

        <div class="w-full bg-amber-900/20 dark:bg-amber-900/50 rounded-full h-3 border border-amber-600/30 overflow-hidden">
          <div class="bg-gradient-to-r from-amber-500 to-sfl-green h-full rounded-full transition-all duration-300" style="width: ${progress.percentage}%"></div>
        </div>

        <div class="flex justify-between items-center text-[10px] text-sfl-woodLight font-mono pt-0.5">
          <span>Target: <strong class="text-sfl-dirt dark:text-amber-200">${progress.nextMilestone} pts</strong></span>
          <span class="text-sfl-accent dark:text-amber-400 font-bold">${progress.pointsNeeded} pts needed</span>
        </div>

        <div class="text-[10px] text-sfl-green dark:text-green-400 font-semibold border-t border-amber-200/40 dark:border-amber-700/30 pt-1 flex items-center gap-1">
          <span>🎁</span> Reward: <strong class="text-sfl-dirt dark:text-amber-100">${progress.rewardText}</strong>
        </div>
      </div>

      <!-- FAVORITE FLOWERS WITH POINTS & FLOWERS NEEDED -->
      <div class="space-y-1.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood flex items-center gap-1">
          <span>🌸</span> Favorite Flowers:
        </span>
        <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          ${favoritesHtml}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

window.renderNpcCards = renderNpcCards;
