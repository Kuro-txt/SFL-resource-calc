import { FLOWER_IMG_SMALL_HTML, FLOWER_IMG_HTML } from '../config/constants.js';
import { normalizeItemKey, roundUpToThreeDecimals } from '../utils/formatters.js';

// Base NPC Gift Data Catalog
export const NPC_CATALOG = [
  {
    id: "pumpkin_pete",
    name: "Pumpkin Pete",
    location: "Plaza",
    icon: "🎃",
    favorites: ["Mashed Potato", "Pumpkin Soup", "Vegetable Stew"],
    likes: ["Pumpkin", "Potato", "Carrot"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  },
  {
    id: "hank",
    name: "Hank",
    location: "Plaza",
    icon: "🤠",
    favorites: ["Club Sandwich", "Roast Veggies", "Sunflower Crunch"],
    likes: ["Wheat", "Hay", "Corn"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  },
  {
    id: "corny",
    name: "Corny",
    location: "Plaza",
    icon: "🌽",
    favorites: ["Popcorn", "Cornbread"],
    likes: ["Corn", "Soybean"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  },
  {
    id: "raven",
    name: "Raven",
    location: "Plaza",
    icon: "🧙‍♀️",
    favorites: ["Goblin Brunch", "Boiled Eggs"],
    likes: ["Egg", "Mushroom", "Radish"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  },
  {
    id: "tywin",
    name: "Tywin",
    location: "Plaza",
    icon: "👑",
    favorites: ["Gold Egg", "Feather"],
    likes: ["Wheat", "Egg"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  },
  {
    id: "bert",
    name: "Bert",
    location: "Plaza",
    icon: "🍄",
    favorites: ["Mushroom Salad", "Mushroom Soup"],
    likes: ["Mushroom", "Wild Mushroom"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  },
  {
    id: "finn",
    name: "Finn",
    location: "Beach",
    icon: "🎣",
    favorites: ["Fish Burger", "Fish and Chips", "Chowder"],
    likes: ["Seaweed", "Anchovy", "Tuna"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  },
  {
    id: "miranda",
    name: "Miranda",
    location: "Beach",
    icon: "🐚",
    favorites: ["Fruit Salad", "Orange Juice"],
    likes: ["Blueberry", "Orange", "Apple"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  },
  {
    id: "tango",
    name: "Tango",
    location: "Desert",
    icon: "🐒",
    favorites: ["Banana Pop", "Fruit Salad"],
    likes: ["Banana", "Apple"],
    pointsMultiplier: { favorite: 3, liked: 1 }
  }
];

let dailyGiftedState = {};
let activeLocationFilter = 'all';

function loadGiftedState() {
  const today = new Date().toISOString().split('T')[0];
  const stored = JSON.parse(localStorage.getItem('sfl_npc_gifted_state') || '{}');

  if (stored.date !== today) {
    dailyGiftedState = { date: today, npcs: {} };
    localStorage.setItem('sfl_npc_gifted_state', JSON.stringify(dailyGiftedState));
  } else {
    dailyGiftedState = stored;
  }
}

function saveGiftedState() {
  localStorage.setItem('sfl_npc_gifted_state', JSON.stringify(dailyGiftedState));
}

function getItemFlowerPrice(cleanKey) {
  if (window.allPrices) {
    let matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (matchedKey) {
      let rawPrice = parseFloat(window.allPrices[matchedKey]) || 0;
      if (rawPrice > 0) return rawPrice > 100 ? rawPrice / 1000 : rawPrice;
    }
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
            <span>🎁</span> NPC Gifts & Friendship Tracker
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            Track daily gifts, favorite items, and live market Flower costs.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <!-- SEARCH -->
          <input type="text" id="npc-search-input" placeholder="Search NPC or Gift..." class="sfl-input rounded-lg px-2.5 py-1 text-xs font-bold text-sfl-dirt w-full sm:w-44 focus:ring-1 focus:ring-sfl-gold">

          <!-- LOCATION FILTER -->
          <select id="npc-location-filter" class="sfl-input rounded-lg px-2 py-1 text-xs font-bold text-sfl-dirt cursor-pointer">
            <option value="all">📍 All Locations</option>
            <option value="Plaza">Plaza</option>
            <option value="Beach">Beach</option>
            <option value="Desert">Desert</option>
          </select>

          <button id="reset-daily-gifts-btn" class="bg-sfl-accent text-white font-bold px-3 py-1 rounded-lg text-xs hover:bg-red-700 transition cursor-pointer shadow-xs">
            🔄 Reset Today
          </button>
        </div>
      </div>

      <!-- PROGRESS OVERVIEW -->
      <div class="bg-sfl-gold/20 border-2 border-sfl-gold rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-center gap-2 text-center sm:text-left">
        <div class="flex items-center gap-2.5">
          <span class="text-2xl">💝</span>
          <div>
            <span class="text-xs font-bold text-sfl-dirt block">Today's Gifting Progress</span>
            <span id="npc-gifted-count" class="text-[11px] font-mono text-sfl-wood font-semibold">0 / 0 NPCs Gifted</span>
          </div>
        </div>
        <div class="w-full sm:w-48 bg-white/80 dark:bg-amber-950/40 rounded-full h-3.5 border border-sfl-cardBorder overflow-hidden">
          <div id="npc-progress-bar" class="bg-sfl-green h-full w-0 transition-all duration-300"></div>
        </div>
      </div>

      <!-- NPC CARDS GRID -->
      <div id="npc-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"></div>
    </div>
  `;
}

export function initNpcGiftsPanel() {
  loadGiftedState();
  renderNpcGiftsTemplate();
  renderNpcCards();

  document.getElementById('npc-search-input')?.addEventListener('input', renderNpcCards);
  document.getElementById('npc-location-filter')?.addEventListener('change', (e) => {
    activeLocationFilter = e.target.value;
    renderNpcCards();
  });

  document.getElementById('reset-daily-gifts-btn')?.addEventListener('click', () => {
    if (confirm("Reset today's gifting checklist?")) {
      const today = new Date().toISOString().split('T')[0];
      dailyGiftedState = { date: today, npcs: {} };
      saveGiftedState();
      renderNpcCards();
    }
  });
}

export function toggleNpcGift(npcId) {
  dailyGiftedState.npcs = dailyGiftedState.npcs || {};
  dailyGiftedState.npcs[npcId] = !dailyGiftedState.npcs[npcId];
  saveGiftedState();
  renderNpcCards();
}

window.toggleNpcGift = toggleNpcGift;

export function renderNpcCards() {
  const grid = document.getElementById('npc-cards-grid');
  if (!grid) return;

  const query = document.getElementById('npc-search-input')?.value.toLowerCase().trim() || '';
  const filter = activeLocationFilter;

  const filteredNpcs = NPC_CATALOG.filter(npc => {
    const matchesLoc = filter === 'all' || npc.location.toLowerCase() === filter.toLowerCase();
    const matchesQuery = !query || 
      npc.name.toLowerCase().includes(query) || 
      npc.favorites.some(f => f.toLowerCase().includes(query)) ||
      npc.likes.some(l => l.toLowerCase().includes(query));
    return matchesLoc && matchesQuery;
  });

  let totalGifted = 0;
  NPC_CATALOG.forEach(npc => {
    if (dailyGiftedState.npcs?.[npc.id]) totalGifted++;
  });

  const countEl = document.getElementById('npc-gifted-count');
  const barEl = document.getElementById('npc-progress-bar');
  if (countEl) countEl.textContent = `${totalGifted} / ${NPC_CATALOG.length} NPCs Gifted`;
  if (barEl) {
    const pct = Math.round((totalGifted / NPC_CATALOG.length) * 100);
    barEl.style.width = `${pct}%`;
  }

  if (filteredNpcs.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-sfl-woodLight italic">No NPCs found matching your search.</div>`;
    return;
  }

  grid.innerHTML = '';

  filteredNpcs.forEach(npc => {
    const isGifted = !!dailyGiftedState.npcs?.[npc.id];

    // Build favorite items list with live prices
    const favoritesHtml = npc.favorites.map(item => {
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
    }).join('');

    const card = document.createElement('div');
    card.className = `p-3.5 rounded-xl border-2 transition shadow-sm space-y-3 ${
      isGifted 
        ? 'bg-green-50/80 dark:bg-green-950/20 border-sfl-green/50 opacity-90' 
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

        <button onclick="toggleNpcGift('${npc.id}')" class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
          isGifted 
            ? 'bg-sfl-green text-white shadow-xs' 
            : 'bg-amber-100 dark:bg-amber-900/50 text-sfl-wood border border-sfl-cardBorder hover:bg-amber-200'
        }">
          <span>${isGifted ? '✅ Gifted' : '🎁 Gift'}</span>
        </button>
      </div>

      <!-- FAVORITE GIFTS (3X POINTS) -->
      <div class="space-y-1.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-sfl-wood flex items-center gap-1">
          <span>⭐</span> Favorite Gifts (3x Points):
        </span>
        <div class="space-y-1">
          ${favoritesHtml}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

window.renderNpcCards = renderNpcCards;
