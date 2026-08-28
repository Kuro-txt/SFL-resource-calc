import { FLOWER_IMG_SMALL_HTML } from '../config/constants.js';
import { normalizeItemKey, getBettyUnitPrice } from '../utils/formatters.js';

// Strict catalog of 14 NPCs with verified Milestone Rewards & Total Flower Point values
export const NPC_CATALOG = [
  {
    id: "betty",
    name: "Betty",
    location: "Plaza",
    icon: "👩‍🌾",
    milestones: [
      { pts: 10, reward: "Coins: 120" },
      { pts: 20, reward: "Coins: 960, Recipe: Basic Bed" },
      { pts: 40, reward: "Treasure Key: 1, Recipe: Doll" },
      { pts: 110, reward: "Radish Cake: 1, Recipe: Buzz Doll" }
    ],
    repeatInterval: 100,
    repeatReward: "Treasure Key: 1",
    favorites: [
      { name: "Red Pansy", pts: 8 },
      { name: "Yellow Pansy", pts: 8 },
      { name: "Purple Pansy", pts: 8 },
      { name: "White Pansy", pts: 8 },
      { name: "Blue Pansy", pts: 8 }
    ]
  },
  {
    id: "Pumpkin' Pete",
    name: "Pumpkin' Pete",
    location: "Plaza",
    icon: "🎃",
    milestones: [
      { pts: 5, reward: "Coins: 160" },
      { pts: 12, reward: "Treasure Key: 1" },
      { pts: 50, reward: "Pumpkin Hat: 1" },
      { pts: 100, reward: "Coins: 640" }
    ],
    repeatInterval: 100,
    repeatReward: "Coins: 640, Treasure Key: 1",
    favorites: [
      { name: "Yellow Cosmos", pts: 9 }
    ]
  },
  {
    id: "blacksmith",
    name: "Blacksmith",
    location: "Plaza",
    icon: "🔨",
    milestones: [
      { pts: 50, reward: "Treasure Key: 1, Recipe: Timber" },
      { pts: 110, reward: "Coins: 760, Recipe: Cushion" },
      { pts: 200, reward: "Coins: 1600, Recipe: Hardened Leather" },
      { pts: 320, reward: "Pickaxe: 10, Recipe: Crimsteel" }
    ],
    repeatInterval: 150,
    repeatReward: "Coins: 960, Treasure Key: 1",
    favorites: [
      { name: "Red Carnation", pts: 10 }
    ]
  },
  {
    id: "bert",
    name: "Bert",
    location: "Plaza",
    icon: "🍄",
    milestones: [
      { pts: 60, reward: "Tattered Jacket: 1, Recipe: Wooly Doll" },
      { pts: 100, reward: "Gem: 20, Recipe: Cluck Doll" },
      { pts: 210, reward: "Pirate Cake: 3, Recipe: Cow Bed" },
      { pts: 330, reward: "Greyed Glory: 1, Recipe: Moo Doll" }
    ],
    repeatInterval: 150,
    repeatReward: "Rare Key: 1",
    favorites: [
      { name: "Red Lotus", pts: 13 },
      { name: "Yellow Lotus", pts: 13 },
      { name: "Purple Lotus", pts: 13 },
      { name: "White Lotus", pts: 13 },
      { name: "Blue Lotus", pts: 13 }
    ]
  },
  {
    id: "finley",
    name: "Finley",
    location: "Beach",
    icon: "🎣",
    milestones: [
      { pts: 25, reward: "Fishing Lure: 3, Recipe: Fisher Bed" },
      { pts: 95, reward: "Coins: 3200" },
      { pts: 150, reward: "Tuna: 5" }
    ],
    repeatInterval: 100,
    repeatReward: "Fishing Lure: 5",
    favorites: [
      { name: "Red Daffodil", pts: 12 },
      { name: "Yellow Daffodil", pts: 12 },
      { name: "Purple Daffodil", pts: 12 },
      { name: "White Daffodil", pts: 12 },
      { name: "Blue Daffodil", pts: 12 }
    ]
  },
  {
    id: "raven",
    name: "Raven",
    location: "Plaza",
    icon: "🧙‍♀️",
    milestones: [
      { pts: 50, reward: "Time Warp Totem: 1" },
      { pts: 140, reward: "Coins: 2560, Recipe: Lunar Doll" },
      { pts: 220, reward: "Victorian Hat: 1" },
      { pts: 330, reward: "Coins: 1600, Eggplant Seed: 50, Recipe: Shadow Doll" },
      { pts: 700, reward: "Bat Wings: 1" }
    ],
    repeatInterval: 160,
    repeatReward: "Rare Key: 1",
    favorites: [
      { name: "Purple Carnation", pts: 11 },
      { name: "Purple Lotus", pts: 12 },
      { name: "Purple Daffodil", pts: 11 },
      { name: "Purple Pansy", pts: 7 },
      { name: "Purple Cosmos", pts: 7 },
      { name: "Purple Balloon Flower", pts: 9 },
      { name: "Purple Gladiolus", pts: 7 },
      { name: "Purple Lavender", pts: 8 },
      { name: "Purple Clover", pts: 7 },
      { name: "Purple Edelweiss", pts: 8 }
    ]
  },
  {
    id: "tywin",
    name: "Tywin",
    location: "Plaza",
    icon: "👑",
    milestones: [
      { pts: 35, reward: "Rare Key: 1" },
      { pts: 175, reward: "Coins: 3200" },
      { pts: 330, reward: "Pirate Cake: 5" }
    ],
    repeatInterval: 160,
    repeatReward: "Luxury Key: 1",
    favorites: [
      { name: "Primula Enigma", pts: 19 },
      { name: "Celestial Frostbloom", pts: 18 }
    ]
  },
  {
    id: "old_salty",
    name: "Old Salty",
    location: "Beach",
    icon: "🏴‍☠️",
    milestones: [
      { pts: 30, reward: "Coins: 80, Striped Blue Shirt: 1" },
      { pts: 90, reward: "Coins: 260, Peg Leg: 1, Recipe: Gilded Doll" },
      { pts: 500, reward: "Pirate Potion: 1, Recipe: Pirate Bed" },
      { pts: 850, reward: "Pirate Bounty: 1, Pirate Hat: 1, Recipe: Ocean's Treasure" }
    ],
    repeatInterval: 250,
    repeatReward: "Coins: 2500",
    favorites: [
      { name: "Blue Carnation", pts: 11 },
      { name: "Blue Lotus", pts: 12 },
      { name: "Blue Daffodil", pts: 11 },
      { name: "Blue Pansy", pts: 7 },
      { name: "Blue Balloon Flower", pts: 10 },
      { name: "Blue Cosmos", pts: 7 },
      { name: "Blue Gladiolus", pts: 8 },
      { name: "Blue Lavender", pts: 7 },
      { name: "Blue Clover", pts: 8 },
      { name: "Blue Edelweiss", pts: 7 }
    ]
  },
  {
    id: "miranda",
    name: "Miranda",
    location: "Beach",
    icon: "🐚",
    milestones: [
      { pts: 30, reward: "Time Warp Totem: 1, Recipe: Floral Bed" },
      { pts: 90, reward: "Coins: 960, Fruit Picker Shirt: 1" },
      { pts: 260, reward: "Fruit Picker Apron: 1, Recipe: Desert Bed" },
      { pts: 500, reward: "Coins: 6400, Fruit Bowl: 1, Recipe: Juicy Doll" }
    ],
    repeatInterval: 100,
    repeatReward: "Blueberry Seed: 5, Apple Seed: 5, Banana Plant: 5, Orange Seed: 5",
    favorites: [
      { name: "Yellow Carnation", pts: 11 },
      { name: "Yellow Lotus", pts: 12 },
      { name: "Yellow Daffodil", pts: 11 },
      { name: "Yellow Pansy", pts: 7 },
      { name: "Yellow Balloon Flower", pts: 10 },
      { name: "Yellow Cosmos", pts: 7 },
      { name: "Yellow Gladiolus", pts: 8 },
      { name: "Yellow Lavender", pts: 8 },
      { name: "Yellow Clover", pts: 8 },
      { name: "Yellow Edelweiss", pts: 8 }
    ]
  },
  {
    id: "finn",
    name: "Finn",
    location: "Beach",
    icon: "🐡",
    milestones: [
      { pts: 40, reward: "Rod: 10" },
      { pts: 150, reward: "Coins: 960" }
    ],
    repeatInterval: 130,
    repeatReward: "Rare Key: 1",
    favorites: [
      { name: "White Cosmos", pts: 8 },
      { name: "Blue Cosmos", pts: 8 }
    ]
  },
  {
    id: "corale",
    name: "Corale",
    location: "Beach",
    icon: "🪸",
    milestones: [
      { pts: 45, reward: "Coins: 960" },
      { pts: 150, reward: "Gem: 40, Recipe: Synthetic Fabric" },
      { pts: 320, reward: "Pink Ponytail: 1, Recipe: Kelp Fibre" }
    ],
    repeatInterval: 200,
    repeatReward: "Coins: 3200",
    favorites: [
      { name: "Prism Petal", pts: 18 }
    ]
  },
  {
    id: "cornwell",
    name: "Cornwell",
    location: "Plaza",
    icon: "🌽",
    milestones: [
      { pts: 65, reward: "Rare Key: 1, Recipe: Sturdy Bed" },
      { pts: 175, reward: "Gem: 20" },
      { pts: 340, reward: "Wise Robes: 1, Recipe: Harvest Doll" },
      { pts: 600, reward: "Wise Beard: 1, Recipe: Ember Doll" }
    ],
    repeatInterval: 200,
    repeatReward: "Luxury Key: 1",
    favorites: [
      { name: "Red Balloon Flower", pts: 10 },
      { name: "Yellow Balloon Flower", pts: 10 },
      { name: "Purple Balloon Flower", pts: 10 },
      { name: "White Balloon Flower", pts: 10 },
      { name: "Blue Balloon Flower", pts: 10 }
    ]
  },
  {
    id: "victoria",
    name: "Victoria",
    location: "Kingdom",
    icon: "👸",
    milestones: [
      { pts: 50, reward: "Coins: 2560" },
      { pts: 140, reward: "Time Warp Totem: 1, Recipe: Royal Bed" },
      { pts: 340, reward: "Royal Dress: 1" },
      { pts: 520, reward: "Coins: 16000" },
      { pts: 850, reward: "Queen's Crown: 1" }
    ],
    repeatInterval: 160,
    repeatReward: "Rare Key: 1",
    favorites: [
      { name: "Primula Enigma", pts: 20 }
    ]
  },
  {
    id: "jester",
    name: "Jester",
    location: "Kingdom",
    icon: "🃏",
    milestones: [
      { pts: 50, reward: "Time Warp Totem: 1, Recipe: Royal Bedding" },
      { pts: 140, reward: "Rare Key: 1, Recipe: Royal Ornament" },
      { pts: 340, reward: "Cap n Bells: 1" },
      { pts: 520, reward: "Coins: 16000" },
      { pts: 740, reward: "Motley: 1" }
    ],
    repeatInterval: 90,
    repeatReward: "Treasure Key: 1",
    favorites: [
      { name: "Red Balloon Flower", pts: 11 },
      { name: "Red Carnation", pts: 11 }
    ]
  }
];

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

function getNpcFriendship(npcId, liveNpcData) {
  if (!liveNpcData || typeof liveNpcData !== 'object') return {};

  if (liveNpcData[npcId]?.friendship) {
    return liveNpcData[npcId].friendship;
  }

  const cleanTarget = npcId.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (let key in liveNpcData) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanKey === cleanTarget) {
      return liveNpcData[key]?.friendship || {};
    }
  }

  return {};
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

function calculateMilestoneProgress(npc, points) {
  const milestones = npc.milestones || [];
  const baseCap = milestones.length > 0 ? milestones[milestones.length - 1].pts : 0;
  const repeat = npc.repeatInterval || 100;

  if (points < baseCap) {
    let prev = 0;
    let next = baseCap;
    let nextReward = "";

    for (let m of milestones) {
      if (points < m.pts) {
        next = m.pts;
        nextReward = m.reward;
        break;
      }
      prev = m.pts;
    }

    const currentInTier = points - prev;
    const tierTotal = next - prev;
    const needed = next - points;
    const pct = Math.min(100, Math.max(0, Math.round((currentInTier / tierTotal) * 100)));

    return {
      isRecurring: false,
      currentInTier,
      tierTotal,
      nextMilestone: next,
      pointsNeeded: needed,
      percentage: pct,
      rewardText: nextReward
    };
  } else {
    const steps = Math.floor((points - baseCap) / repeat);
    const cycleStart = baseCap + (steps * repeat);
    const nextMilestone = cycleStart + repeat;
    const currentInTier = points - cycleStart;
    const needed = nextMilestone - points;
    const pct = Math.min(100, Math.max(0, Math.round((currentInTier / repeat) * 100)));

    return {
      isRecurring: true,
      currentInTier,
      tierTotal: repeat,
      nextMilestone,
      pointsNeeded: needed,
      percentage: pct,
      rewardText: npc.repeatReward || `Every ${repeat} pts`
    };
  }
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
