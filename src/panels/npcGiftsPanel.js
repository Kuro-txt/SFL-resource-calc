import { FLOWER_IMG_SMALL_HTML } from '../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../utils/formatters.js';

// NPC Catalog with verified Favorite Flowers from SFL
export const NPC_CATALOG = [
  {
    id: "betty",
    name: "Betty",
    location: "Plaza",
    icon: "👩‍🌾",
    favorites: [
      "Red Pansy",
      "Yellow Pansy",
      "Purple Pansy",
      "White Pansy",
      "Blue Pansy"
    ]
  },
  {
    id: "pumpkin_pete",
    name: "Pumpkin' Pete",
    location: "Plaza",
    icon: "🎃",
    favorites: [
      "Yellow Cosmos"
    ]
  },
  {
    id: "blacksmith",
    name: "Blacksmith",
    location: "Plaza",
    icon: "🔨",
    favorites: [
      "Red Carnation"
    ]
  },
  {
    id: "bert",
    name: "Bert",
    location: "Plaza",
    icon: "🍄",
    favorites: [
      "Red Lotus",
      "Yellow Lotus",
      "Purple Lotus",
      "White Lotus",
      "Blue Lotus"
    ]
  },
  {
    id: "finley",
    name: "Finley",
    location: "Beach",
    icon: "🎣",
    favorites: [
      "Red Daffodil",
      "Yellow Daffodil",
      "Purple Daffodil",
      "White Daffodil",
      "Blue Daffodil"
    ]
  },
  {
    id: "raven",
    name: "Raven",
    location: "Plaza",
    icon: "🧙‍♀️",
    favorites: [
      "Purple Carnation",
      "Purple Lotus",
      "Purple Daffodil",
      "Purple Pansy",
      "Purple Cosmos",
      "Purple Balloon Flower",
      "Purple Gladiolus",
      "Purple Lavender",
      "Purple Clover",
      "Purple Edelweiss"
    ]
  },
  {
    id: "tywin",
    name: "Tywin",
    location: "Plaza",
    icon: "👑",
    favorites: [
      "Primula Enigma",
      "Celestial Frostbloom"
    ]
  },
  {
    id: "old_salty",
    name: "Old Salty",
    location: "Beach",
    icon: "🏴‍☠️",
    favorites: [
      "Blue Carnation",
      "Blue Lotus",
      "Blue Daffodil",
      "Blue Pansy",
      "Blue Balloon Flower",
      "Blue Cosmos",
      "Blue Gladiolus",
      "Blue Lavender",
      "Blue Clover",
      "Blue Edelweiss"
    ]
  },
  {
    id: "miranda",
    name: "Miranda",
    location: "Beach",
    icon: "🐚",
    favorites: [
      "Yellow Carnation",
      "Yellow Lotus",
      "Yellow Daffodil",
      "Yellow Pansy",
      "Yellow Balloon Flower",
      "Yellow Cosmos",
      "Yellow Gladiolus",
      "Yellow Lavender",
      "Yellow Clover",
      "Yellow Edelweiss"
    ]
  },
  {
    id: "finn",
    name: "Finn",
    location: "Beach",
    icon: "🐡",
    favorites: [
      "White Cosmos",
      "Blue Cosmos"
    ]
  },
  {
    id: "corale",
    name: "Corale",
    location: "Beach",
    icon: "🪸",
    favorites: [
      "Prism Petal"
    ]
  },
  {
    id: "cornwell",
    name: "Cornwell",
    location: "Plaza",
    icon: "🌽",
    favorites: [
      "Red Balloon Flower",
      "Yellow Balloon Flower",
      "Purple Balloon Flower",
      "White Balloon Flower",
      "Blue Balloon Flower"
    ]
  },
  {
    id: "victoria",
    name: "Victoria",
    location: "Kingdom",
    icon: "👸",
    favorites: [
      "Primula Enigma"
    ]
  },
  {
    id: "jester",
    name: "Jester",
    location: "Kingdom",
    icon: "🃏",
    favorites: [
      "Red Balloon Flower",
      "Red Carnation"
    ]
  }
];

let activeLocationFilter = 'all';

function isInteractionToday(updatedAtMs) {
  if (!updatedAtMs) return false;
  const interactionDate = new Date(updatedAtMs).toISOString().split('T')[0];
  const todayDate = new Date().toISOString().split('T')[0];
  return interactionDate === todayDate;
}

function getItemFlowerPrice(cleanKey) {
  if (window.allPrices) {
    let matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (matchedKey) {
      let rawPrice = parseFloat(window.allPrices[matchedKey]) || 0;
      if (rawPrice > 0) return rawPrice > 100 ? rawPrice / 1000 : rawPrice;
    }
  }

  const bettyPrice = getBettyUnitPrice(cleanKey);
  if (bettyPrice !== null && bettyPrice > 0) {
    return bettyPrice;
  }

  return 0;
}

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
            Track live friendship points, claimable gifts, and favorite flower market prices.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- SEARCH -->
          <input type="text" id="npc-search-input" placeholder="Search NPC or Flower..." class="sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt w-full sm:w-44 focus:ring-1 focus:ring-sfl-gold">

          <!-- LOCATION FILTER -->
          <select id="npc-location-filter" class="sfl-input rounded-lg px-2 py-1 text-xs font-bold text-sfl-dirt cursor-pointer">
            <option value="all">📍 All Locations</option>
            <option value="Plaza">Plaza</option>
            <option value="Beach">Beach</option>
            <option value="Kingdom">Kingdom</option>
            <option value="Desert">Desert</option>
          </select>
        </div>
      </div>

      <!-- OVERVIEW METRICS -->
      <div class="bg-sfl-gold/20 border-2 border-sfl-gold rounded-xl p-4 shadow-inner">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center items-center">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">NPCs Tracked</span>
            <h2 id="npc-total-count" class="text-xl sm:text-2xl font-pixel font-bold text-sfl-dirt mt-0.5">0</h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-green block">Gifts Ready to Claim</span>
            <h2 id="npc-claimable-gifts" class="text-xl sm:text-2xl font-pixel font-bold text-sfl-green mt-0.5">0</h2>
          </div>
          <div class="border-t sm:border-t-0 sm:border-l border-sfl-cardBorder/40 pt-2 sm:pt-0 px-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood block">Gifted Today (UTC)</span>
            <h2 id="npc-gifted-today-count" class="text-xl sm:text-2xl font-pixel font-bold text-amber-700 mt-0.5">0</h2>
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
}

export function renderNpcCards() {
  const grid = document.getElementById('npc-cards-grid');
  if (!grid) return;

  const liveNpcData = window.farmNpcData || JSON.parse(localStorage.getItem('sfl_farm_npcs') || '{}');
  const query = document.getElementById('npc-search-input')?.value.toLowerCase().trim() || '';
  const filter = activeLocationFilter;

  const knownIds = new Set(NPC_CATALOG.map(n => n.id));
  const fullNpcList = [...NPC_CATALOG];

  Object.keys(liveNpcData).forEach(apiId => {
    if (!knownIds.has(apiId)) {
      const cleanName = apiId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      fullNpcList.push({
        id: apiId,
        name: cleanName,
        location: "Plaza",
        icon: "👤",
        favorites: []
      });
    }
  });

  const filteredNpcs = fullNpcList.filter(npc => {
    const matchesLoc = filter === 'all' || npc.location.toLowerCase() === filter.toLowerCase();
    const matchesQuery = !query || 
      npc.name.toLowerCase().includes(query) || 
      npc.favorites.some(f => f.toLowerCase().includes(query));
    return matchesLoc && matchesQuery;
  });

  let totalClaimable = 0;
  let totalGiftedToday = 0;

  fullNpcList.forEach(npc => {
    const friendship = liveNpcData[npc.id]?.friendship || {};
    const points = parseInt(friendship.points || 0, 10);
    const claimedAt = parseInt(friendship.giftClaimedAtPoints || 0, 10);
    const unclaimed = points - claimedAt;

    if (unclaimed > 0) totalClaimable++;
    if (isInteractionToday(friendship.updatedAt)) totalGiftedToday++;
  });

  const countEl = document.getElementById('npc-total-count');
  const claimableEl = document.getElementById('npc-claimable-gifts');
  const todayEl = document.getElementById('npc-gifted-today-count');

  if (countEl) countEl.textContent = `${fullNpcList.length} NPCs`;
  if (claimableEl) claimableEl.textContent = `${totalClaimable} Ready`;
  if (todayEl) todayEl.textContent = `${totalGiftedToday} / ${fullNpcList.length}`;

  if (filteredNpcs.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-sfl-woodLight italic">No NPCs found matching your criteria.</div>`;
    return;
  }

  grid.innerHTML = '';

  filteredNpcs.forEach(npc => {
    const friendship = liveNpcData[npc.id]?.friendship || {};
    const points = parseInt(friendship.points || 0, 10);
    const claimedAt = parseInt(friendship.giftClaimedAtPoints || 0, 10);
    const unclaimed = Math.max(0, points - claimedAt);
    const hasClaimableGift = unclaimed > 0;
    const giftedToday = isInteractionToday(friendship.updatedAt);

    const favoritesHtml = npc.favorites.length > 0
      ? npc.favorites.map(item => {
          const cleanKey = normalizeItemKey(item);
          const price = getItemFlowerPrice(cleanKey);
          return `
            <div class="flex justify-between items-center bg-amber-100/70 dark:bg-amber-950/40 px-2 py-1 rounded text-xs">
              <span class="font-bold text-sfl-dirt">${item}</span>
              <span class="text-[10px] text-sfl-green font-mono font-bold flex items-center gap-0.5">
                ${price > 0 ? price.toFixed(3) : 'Free/Craft'} ${FLOWER_IMG_SMALL_HTML}
              </span>
            </div>
          `;
        }).join('')
      : `<span class="text-[10px] text-sfl-woodLight italic">No favorite flowers cataloged.</span>`;

    const card = document.createElement('div');
    card.className = `p-3.5 rounded-xl border-2 transition shadow-sm space-y-3 ${
      hasClaimableGift 
        ? 'bg-green-50/80 dark:bg-green-950/20 border-sfl-green/60 shadow-md' 
        : 'bg-white/90 dark:bg-amber-950/30 border-sfl-cardBorder'
    }`;

    card.innerHTML = `
      <!-- TOP HEADER -->
      <div class="flex justify-between items-start border-b border-sfl-cardBorder/40 pb-2">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${npc.icon}</span>
          <div>
            <h4 class="font-bold text-sfl-dirt text-sm">${npc.name}</h4>
            <span class="text-[10px] text-sfl-woodLight font-semibold">📍 ${npc.location}</span>
          </div>
        </div>

        <div class="flex flex-col items-end gap-1">
          ${
            hasClaimableGift 
              ? `<span class="bg-sfl-green text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs animate-pulse">🎁 Gift Ready!</span>`
              : `<span class="bg-amber-100 dark:bg-amber-900/50 text-sfl-wood text-[10px] font-bold px-2 py-0.5 rounded-md border border-sfl-cardBorder/50">Up to date</span>`
          }
          <span class="text-[9px] font-mono ${giftedToday ? 'text-sfl-green font-bold' : 'text-sfl-woodLight'}">
            ${giftedToday ? '✅ Gifted Today' : '⏳ Not Gifted Today'}
          </span>
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

      <!-- FAVORITE FLOWERS -->
      <div class="space-y-1.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood flex items-center gap-1">
          <span>🌸</span> Favorite Flowers:
        </span>
        <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
          ${favoritesHtml}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

window.renderNpcCards = renderNpcCards;
