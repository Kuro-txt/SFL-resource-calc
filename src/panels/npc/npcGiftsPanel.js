import { ApiService } from '../../services/api.js';
import { FLOWER_IMG_SMALL_HTML } from '../../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../../utils/formatters.js';
import { getNpcIconHtml } from '../../utils/npcIcons.js';
import { NPC_CATALOG, formatFlowerRecipe } from './npcData.js';
import { getNpcFriendship, getNpcData, getItemFlowerPrice, calculateMilestoneProgress, checkIsGiftedToday, formatGiftedAt, normalizeTimestampMs } from './npcLogic.js';

let activeLocationFilter = 'all';
let favoriteNpcIds = new Set(JSON.parse(localStorage.getItem('sfl_favorite_npcs') || '[]'));
let blossomBondingRank = (() => {
  const saved = localStorage.getItem('sfl_blossom_bonding_rank');
  if (saved !== null && saved !== '') {
    const r = parseInt(saved, 10);
    if (!isNaN(r) && r >= 0 && r <= 3) return r;
  }
  // Backwards compatibility with previous toggle
  return localStorage.getItem('sfl_blossom_bonding') === 'true' ? 1 : 0;
})();

export function getBlossomBondingBonus(rank = blossomBondingRank) {
  const r = Number(rank);
  if (r === 1) return 2;
  if (r === 2) return 3;
  if (r === 3) return 4;
  return 0;
}

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
      <div class="bg-sfl-card/90 dark:bg-slate-900/80 p-4 rounded-xl border-2 border-sfl-cardBorder dark:border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood dark:text-amber-300 uppercase flex items-center gap-2">
            <span>🎁</span> NPC Gift & Friendship Tracker
          </h3>
          <p class="text-[11px] text-sfl-woodLight dark:text-slate-400 font-semibold">
            Track live friendship points, milestone rewards, deliveries, and required flowers.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- FETCH LIVE NPCS BUTTON -->
          <button type="button" id="npc-fetch-btn"
            class="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 active:translate-y-0.5 text-white font-bold px-3 py-1.5 rounded-lg border border-emerald-800 shadow-xs transition cursor-pointer flex items-center gap-1.5 text-xs whitespace-nowrap group"
            title="Fetch live NPC friendship points & deliveries from Sunflower Land Farm API">
            <svg id="npc-fetch-icon" class="w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span id="npc-fetch-text">Fetch Farm NPCs</span>
          </button>

          <!-- BLOSSOM BONDING SKILL (RANKS 1-3) -->
          <div class="flex items-center gap-1.5 bg-pink-100/90 dark:bg-pink-950/40 border border-pink-300 dark:border-pink-800 px-2 sm:px-2.5 py-1 rounded-lg shadow-xs select-none">
            <span class="text-[11px] font-bold text-pink-900 dark:text-pink-300 whitespace-nowrap flex items-center gap-1" title="Blossom Bonding Skill: Rank 1 (+2 pts), Rank 2 (+3 pts), Rank 3 (+4 pts)">
              <span>🌸</span> Blossom Bonding:
            </span>
            <select id="blossom-bonding-rank" class="bg-white/95 dark:bg-pink-950/80 text-pink-900 dark:text-pink-200 font-bold text-xs rounded border border-pink-400 dark:border-pink-700 px-1.5 sm:px-2 py-0.5 cursor-pointer focus:ring-1 focus:ring-pink-500 shadow-2xs">
              <option value="0" ${blossomBondingRank === 0 ? 'selected' : ''}>Off (+0)</option>
              <option value="1" ${blossomBondingRank === 1 ? 'selected' : ''}>Rank 1 (+2 pts)</option>
              <option value="2" ${blossomBondingRank === 2 ? 'selected' : ''}>Rank 2 (+3 pts)</option>
              <option value="3" ${blossomBondingRank === 3 ? 'selected' : ''}>Rank 3 (+4 pts)</option>
            </select>
          </div>

          <!-- SEARCH -->
          <input type="text" id="npc-search-input" placeholder="Search NPC or Flower..." class="sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt dark:text-amber-100 w-full sm:w-36 focus:ring-1 focus:ring-sfl-gold">

          <!-- LOCATION / GIFT FILTER -->
          <select id="npc-location-filter" class="sfl-input rounded-lg px-2 py-1 text-xs font-bold text-sfl-dirt dark:text-amber-100 cursor-pointer">
            <option value="all">📍 All Locations</option>
            <option value="needs-gift">🎁 Needs Gift Today</option>
            <option value="gifted">✅ Gifted Today</option>
            <option value="Plaza">Plaza</option>
            <option value="Beach">Beach</option>
            <option value="Kingdom">Kingdom</option>
          </select>
        </div>
      </div>

      <!-- SYNC STATUS NOTIFICATION BANNER -->
      <div id="npc-sync-status" class="hidden text-xs text-center font-bold py-1.5 px-3 rounded-lg border transition-all"></div>

      <!-- OVERVIEW METRICS -->
      <div class="bg-sfl-gold/20 border-2 border-sfl-gold rounded-xl p-2.5 sm:p-4 shadow-inner">
        <div class="grid grid-cols-3 gap-1.5 sm:gap-3 text-center items-center">
          <div>
            <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-300 block">NPCs</span>
            <h2 id="npc-total-count" class="text-base sm:text-2xl font-pixel font-bold text-sfl-dirt dark:text-amber-100 mt-0.5">14</h2>
          </div>
          <div class="border-l border-sfl-cardBorder/40 px-1 sm:px-2">
            <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-sfl-gold block">⭐ Favs</span>
            <h2 id="npc-favorited-count" class="text-base sm:text-2xl font-pixel font-bold text-amber-700 dark:text-amber-300 mt-0.5">0</h2>
          </div>
          <div class="border-l border-sfl-cardBorder/40 px-1 sm:px-2">
            <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-sfl-woodLight dark:text-slate-400 block">🚜 Live Sync</span>
            <h2 id="npc-farm-sync-display" class="text-[11px] sm:text-sm font-mono font-bold text-sfl-wood dark:text-amber-200 mt-0.5 sm:mt-1.5 truncate">Not Synced</h2>
          </div>
        </div>
      </div>

      <!-- NPC CARDS GRID -->
      <div id="npc-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5"></div>
    </div>
  `;
}

export function initNpcGiftsPanel() {
  renderNpcGiftsTemplate();
  renderNpcCards();

  document.getElementById('npc-fetch-btn')?.addEventListener('click', handleFetchNpcData);
  document.getElementById('npc-search-input')?.addEventListener('input', renderNpcCards);
  document.getElementById('npc-location-filter')?.addEventListener('change', (e) => {
    activeLocationFilter = e.target.value;
    renderNpcCards();
  });

  document.getElementById('blossom-bonding-rank')?.addEventListener('change', (e) => {
    const val = parseInt(e.target.value, 10);
    blossomBondingRank = (!isNaN(val) && val >= 0 && val <= 3) ? val : 0;
    localStorage.setItem('sfl_blossom_bonding_rank', String(blossomBondingRank));
    localStorage.setItem('sfl_blossom_bonding', blossomBondingRank > 0 ? 'true' : 'false');
    renderNpcCards();
  });

  if (typeof window !== 'undefined' && !window._npcPricesBound) {
    window._npcPricesBound = true;
    window.addEventListener('pricesLoaded', () => {
      renderNpcCards();
    });
  }
}

export async function handleFetchNpcData() {
  const farmIdEl = document.getElementById('farm-id');
  const apiKeyEl = document.getElementById('api-key');
  const statusEl = document.getElementById('npc-sync-status');
  const btn = document.getElementById('npc-fetch-btn');
  const icon = document.getElementById('npc-fetch-icon');
  const text = document.getElementById('npc-fetch-text');

  const farmId = farmIdEl?.value.trim() || localStorage.getItem('sfl_farm_id') || '';
  const apiKey = apiKeyEl?.value.trim() || localStorage.getItem('sfl_api_key') || '';

  if (!farmId) {
    if (statusEl) {
      statusEl.className = 'text-xs text-center font-bold py-1.5 px-3 rounded-lg border bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700 block';
      statusEl.innerHTML = '❌ Please enter your Farm ID in the top bar to fetch live NPC data.';
    }
    farmIdEl?.focus();
    return;
  }

  if (btn) btn.disabled = true;
  if (icon) icon.classList.add('animate-spin');
  if (text) text.textContent = 'Fetching...';
  if (statusEl) {
    statusEl.className = 'text-xs text-center font-bold py-1.5 px-3 rounded-lg border bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700 block animate-pulse';
    statusEl.innerHTML = `⏳ Fetching live NPC friendship & deliveries for Farm #${farmId} from Sunflower Land API...`;
  }

  try {
    const farmObj = await ApiService.getFarmFullData(farmId, apiKey, { force: true });
    const npcs = farmObj?.npcs || farmObj?.farm?.npcs || (farmObj?.blacksmith ? farmObj : {});
    const npcKeys = Object.keys(npcs);

    if (npcKeys.length > 0) {
      window.farmNpcData = npcs;
      localStorage.setItem('sfl_farm_npcs', JSON.stringify(npcs));
      localStorage.setItem('sfl_farm_npcs_synced_at', Date.now().toString());

      renderNpcCards();

      if (statusEl) {
        statusEl.className = 'text-xs text-center font-bold py-1.5 px-3 rounded-lg border bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 block';
        statusEl.innerHTML = `✅ Successfully fetched live data for ${npcKeys.length} NPCs from Farm #${farmId}!`;
      }
    } else {
      throw new Error("No NPC data returned in farm response.");
    }
  } catch (err) {
    console.error("NPC fetch error:", err);
    if (statusEl) {
      statusEl.className = 'text-xs text-center font-bold py-1.5 px-3 rounded-lg border bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700 block';
      statusEl.innerHTML = `❌ Failed to fetch NPC data: ${err.message}`;
    }
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.classList.remove('animate-spin');
    if (text) text.textContent = 'Fetch Farm NPCs';
  }
}
window.handleFetchNpcData = handleFetchNpcData;

export function renderNpcCards() {
  const grid = document.getElementById('npc-cards-grid');
  if (!grid) return;

  const liveNpcData = 
    (window.farmNpcData && Object.keys(window.farmNpcData).length > 0 ? window.farmNpcData : null) || 
    window.farmData?.npcs || 
    window.farmData?.farm?.npcs || 
    JSON.parse(localStorage.getItem('sfl_farm_npcs') || '{}');
  const query = document.getElementById('npc-search-input')?.value.toLowerCase().trim() || '';
  const filter = activeLocationFilter;

  const fullNpcList = NPC_CATALOG;

  const filteredNpcs = fullNpcList.filter(npc => {
    const npcEntry = getNpcData(npc, liveNpcData);
    const friendship = npcEntry.friendship || getNpcFriendship(npc, liveNpcData);
    const giftedAt = normalizeTimestampMs(
      friendship.giftedAt || 
      npcEntry.giftedAt || 
      friendship.lastGiftedAt || 
      npcEntry.lastGiftedAt || 
      friendship.gifted_at || 
      npcEntry.gifted_at || 
      0
    );
    const hasGiftedToday = checkIsGiftedToday(giftedAt);

    let matchesLoc = true;
    if (filter === 'needs-gift') {
      matchesLoc = !hasGiftedToday;
    } else if (filter === 'gifted') {
      matchesLoc = hasGiftedToday;
    } else if (filter !== 'all') {
      matchesLoc = npc.location.toLowerCase() === filter.toLowerCase();
    }

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

    // Secondary sort: un-gifted NPCs come first
    const aData = getNpcData(a, liveNpcData);
    const aFriendship = aData.friendship || getNpcFriendship(a, liveNpcData);
    const aGifted = checkIsGiftedToday(normalizeTimestampMs(
      aFriendship.giftedAt || aData.giftedAt || aFriendship.lastGiftedAt || aData.lastGiftedAt || 0
    ));

    const bData = getNpcData(b, liveNpcData);
    const bFriendship = bData.friendship || getNpcFriendship(b, liveNpcData);
    const bGifted = checkIsGiftedToday(normalizeTimestampMs(
      bFriendship.giftedAt || bData.giftedAt || bFriendship.lastGiftedAt || bData.lastGiftedAt || 0
    ));

    if (!aGifted && bGifted) return -1;
    if (aGifted && !bGifted) return 1;

    return 0;
  });

  const countEl = document.getElementById('npc-total-count');
  const favEl = document.getElementById('npc-favorited-count');
  const farmSyncEl = document.getElementById('npc-farm-sync-display');

  if (countEl) countEl.textContent = `${fullNpcList.length} NPCs`;
  if (favEl) favEl.textContent = `${favoriteNpcIds.size}`;

  if (filteredNpcs.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-sfl-woodLight italic">No NPCs found matching your criteria.</div>`;
    return;
  }

  grid.innerHTML = '';

  filteredNpcs.forEach(npc => {
    const isFav = favoriteNpcIds.has(npc.id);
    const npcEntry = getNpcData(npc, liveNpcData);
    const friendship = npcEntry.friendship || getNpcFriendship(npc, liveNpcData);
    const points = parseInt(friendship.points || 0, 10);
    const deliveryCount = parseInt(npcEntry.deliveryCount || 0, 10);
    const giftedAt = normalizeTimestampMs(
      friendship.giftedAt || 
      npcEntry.giftedAt || 
      friendship.lastGiftedAt || 
      npcEntry.lastGiftedAt || 
      friendship.gifted_at || 
      npcEntry.gifted_at || 
      0
    );
    const hasGiftedToday = checkIsGiftedToday(giftedAt);

    const progress = calculateMilestoneProgress(npc, points);

    const favoritesHtml = npc.favorites.map(item => {
      const favName = typeof item === 'string' ? item : item.name;
      const basePts = typeof item === 'object' && typeof item.pts === 'number' ? item.pts : 0;
      const bonusPts = getBlossomBondingBonus(blossomBondingRank);
      const effectivePts = basePts + bonusPts;

      const flowersNeeded = (progress.pointsNeeded > 0 && effectivePts > 0)
        ? Math.ceil(progress.pointsNeeded / effectivePts)
        : 0;

      const cleanKey = normalizeItemKey(favName);
      const price = getItemFlowerPrice(cleanKey);
      const recipeText = formatFlowerRecipe(favName);
      const recipeTitle = recipeText
        ? `Crafting Recipe: ${recipeText} (${price.toFixed(3)} SFL)`
        : (price > 0 ? `${price.toFixed(3)} SFL` : '');
      const priceBadge = price > 0
        ? `<span class="text-[9px] sm:text-[10px] text-sfl-green font-mono font-bold flex items-center gap-0.5 cursor-help shrink-0" ${recipeTitle ? `title="${recipeTitle}"` : ''}>${price.toFixed(3)} ${FLOWER_IMG_SMALL_HTML}</span>`
        : '';

      const totalNeededCost = (flowersNeeded > 0 && price > 0) ? (flowersNeeded * price).toFixed(3) : null;
      const neededTitle = progress.pointsNeeded > 0
        ? `title="${flowersNeeded} flowers needed to reach next milestone (${progress.pointsNeeded} pts remaining)"`
        : '';

      const calcBadge = (flowersNeeded > 0 && price > 0)
        ? `<span class="text-[9px] sm:text-[10px] font-mono font-extrabold text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 shrink-0 cursor-help" title="Total Crafting Cost: ${totalNeededCost} SFL (${price.toFixed(3)} × ${flowersNeeded})">${totalNeededCost}</span>`
        : '';

      const ptsTooltip = bonusPts > 0 
        ? `title="Base: ${basePts} pts + Blossom Bonding Rank ${blossomBondingRank} (+${bonusPts} pts)"`
        : `title="Base: ${basePts} pts"`;

      return `
        <div class="bg-amber-100/70 dark:bg-amber-950/40 p-1.5 sm:p-2 rounded-lg text-xs space-y-1 border border-amber-200/50 dark:border-amber-900/40">
          <!-- Row 1: Full Flower Name & Crafting Price -->
          <div class="flex justify-between items-baseline gap-1.5 min-w-0">
            <span class="font-bold text-sfl-dirt dark:text-amber-100 text-[11px] sm:text-xs leading-snug whitespace-normal break-words overflow-visible">
              ${favName}
            </span>
            ${priceBadge}
          </div>

          <!-- Row 2: Friendship Pts, Quantity Needed & Total Craft Cost -->
          <div class="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-mono pt-0.5">
            <span class="font-extrabold text-amber-800 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-1.5 py-0.5 rounded shrink-0 cursor-help" ${ptsTooltip}>
              +${effectivePts} pts
            </span>

            <div class="flex items-center gap-1 shrink-0 flex-wrap justify-end">
              ${progress.pointsNeeded > 0 ? `
                <span class="font-bold bg-amber-200/90 dark:bg-amber-900/50 text-sfl-wood dark:text-amber-200 px-1.5 py-0.5 rounded border border-amber-300/80 dark:border-amber-700 cursor-help shrink-0" ${neededTitle}>
                  ${flowersNeeded} needed
                </span>
              ` : ''}
              ${calcBadge}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const card = document.createElement('div');
    const notGiftedHighlight = !hasGiftedToday
      ? 'border-amber-500/90 dark:border-amber-500/80 shadow-md bg-amber-50/50 dark:bg-amber-950/40 ring-1 ring-amber-400/50'
      : 'border-sfl-cardBorder dark:border-amber-900/50 bg-white/90 dark:bg-amber-950/20';

    card.className = `p-2.5 sm:p-3.5 rounded-xl border-2 transition shadow-sm space-y-2 sm:space-y-2.5 relative min-w-0 overflow-hidden ${
      isFav ? 'ring-2 ring-sfl-gold/70' : ''
    } ${notGiftedHighlight}`;

    card.innerHTML = `
      <!-- TOP HEADER -->
      <div class="flex justify-between items-start border-b border-sfl-cardBorder/40 dark:border-amber-900/40 pb-1.5 sm:pb-2 gap-2 min-w-0">
        <div class="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          ${getNpcIconHtml(npc.id || npc.name, { fallbackEmoji: npc.icon, className: 'w-7 h-7 sm:w-8 sm:h-8' })}
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <h4 class="font-bold text-sfl-dirt dark:text-amber-200 text-xs sm:text-sm truncate">${npc.name}</h4>
              <button onclick="toggleFavoriteNpc('${npc.id}')" title="${isFav ? 'Remove Favorite' : 'Favorite NPC'}" class="text-xs transition-transform hover:scale-125 cursor-pointer leading-none shrink-0">
                ${isFav ? '⭐' : '☆'}
              </button>
            </div>
            <div class="flex items-center gap-1 text-[9px] sm:text-[10px] text-sfl-woodLight dark:text-slate-400 font-semibold truncate">
              <span>📍 ${npc.location}</span>
              <span>•</span>
              <span title="${giftedAt ? 'Last gifted: ' + new Date(giftedAt).toUTCString() : 'Never gifted'}" class="${!hasGiftedToday ? 'text-amber-800 dark:text-amber-300 font-bold' : ''}">
                🎁 ${formatGiftedAt(giftedAt)}
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col items-end gap-1 shrink-0">
          ${hasGiftedToday ? `
            <span class="text-[9px] sm:text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shadow-2xs flex items-center gap-1">
              <span>✅</span> Gifted
            </span>
          ` : `
            <span class="text-[9px] sm:text-[10px] font-bold bg-amber-100 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-400 dark:border-amber-600 shadow-2xs flex items-center gap-1">
              <span>🎁</span> Needs Gift
            </span>
          `}
          ${deliveryCount > 0 ? `
            <span class="text-[9px] font-mono text-sfl-woodLight dark:text-slate-400 font-medium">
              📦 ${deliveryCount} deliveries
            </span>
          ` : ''}
        </div>
      </div>

      <!-- MILESTONE PROGRESS BAR WITH EXACT REWARD NAME -->
      <div class="bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-700/40 rounded-lg p-2 sm:p-2.5 space-y-1 sm:space-y-1.5">
        <div class="flex justify-between items-center text-[10px] sm:text-[11px] font-bold font-mono">
          <span class="text-sfl-wood dark:text-amber-300">
            ${progress.isRecurring ? '🔄 Recurring' : '🎯 Next Reward'}
          </span>
          <span class="text-sfl-dirt dark:text-amber-100 font-extrabold">
            ${progress.currentInTier} / ${progress.tierTotal} pts (${progress.percentage}%)
          </span>
        </div>

        <div class="w-full bg-amber-900/20 dark:bg-amber-900/50 rounded-full h-2 sm:h-2.5 border border-amber-600/30 overflow-hidden">
          <div class="bg-gradient-to-r from-amber-500 to-sfl-green h-full rounded-full transition-all duration-300" style="width: ${progress.percentage}%"></div>
        </div>

        <div class="flex justify-between items-center text-[9px] sm:text-[10px] text-sfl-woodLight dark:text-slate-400 font-mono pt-0.5">
          <span>Target: <strong class="text-sfl-dirt dark:text-amber-200">${progress.nextMilestone} pts</strong></span>
          <span class="text-sfl-accent dark:text-amber-400 font-bold">${progress.pointsNeeded} pts needed</span>
        </div>

        <div class="text-[9px] sm:text-[10px] text-sfl-green dark:text-green-400 font-semibold border-t border-amber-200/40 dark:border-amber-700/30 pt-1 flex items-center gap-1 min-w-0">
          <span class="shrink-0">🎁</span> <span class="shrink-0">Reward:</span> <strong class="text-sfl-dirt dark:text-amber-100 whitespace-normal break-words">${progress.rewardText}</strong>
        </div>
      </div>

      <!-- FAVORITE FLOWERS WITH POINTS & FLOWERS NEEDED -->
      <div class="space-y-1 sm:space-y-1.5">
        <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-sfl-wood dark:text-amber-300 flex items-center gap-1">
          <span>🌸</span> Favorite Flowers:
        </span>
        <div class="space-y-1 sm:space-y-1.5 max-h-36 sm:max-h-40 overflow-y-auto pr-0.5">
          ${favoritesHtml}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  if (farmSyncEl) {
    const savedFarmId = localStorage.getItem('sfl_farm_id');
    const syncedAt = localStorage.getItem('sfl_farm_npcs_synced_at');
    if (savedFarmId && syncedAt) {
      const elapsedMins = Math.floor((Date.now() - parseInt(syncedAt, 10)) / 60000);
      const timeText = elapsedMins < 1 ? 'Just now' : `${elapsedMins}m ago`;
      farmSyncEl.innerHTML = `<span class="text-emerald-700 dark:text-emerald-400">#${savedFarmId}</span> <span class="text-[10px] font-normal text-sfl-woodLight dark:text-slate-400">(${timeText})</span>`;
    } else if (savedFarmId) {
      farmSyncEl.innerHTML = `<span class="text-sfl-dirt dark:text-amber-200">#${savedFarmId}</span> <span class="text-[10px] font-normal text-sfl-woodLight dark:text-slate-400">(cached)</span>`;
    } else {
      farmSyncEl.textContent = 'Not Synced';
    }
  }
}

window.renderNpcCards = renderNpcCards;
