import { KNOWN_PETS, PET_MILESTONE_PERKS, PET_FOOD_FALLBACK_PRICES } from './petsData.js';
import { normalizeItemKey } from '../../utils/formatters.js';

/**
 * Calculates level and progress using the quadratic SFL formula:
 * Level 1: 0 XP
 * Level L >= 2: XP = 60 * ((L - 1)^2 + 1)
 */
export function calculatePetLevel(rawXp) {
  const xp = Math.max(0, parseFloat(rawXp) || 0);

  if (xp < 120) {
    const startXp = 0;
    const nextXp = 120;
    const xpInLevel = xp;
    const xpNeeded = 120;
    const progress = Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));
    return {
      level: 1,
      currentXp: xp,
      startXp,
      nextXp,
      xpInLevel,
      xpNeeded,
      remainingXp: Math.max(0, nextXp - xp),
      progress: Math.round(progress * 10) / 10
    };
  }

  // For level >= 2: L = floor(sqrt((xp / 60) - 1)) + 1
  const level = Math.floor(Math.sqrt((xp / 60) - 1)) + 1;
  const startXp = 60 * (Math.pow(level - 1, 2) + 1);
  const nextXp = 60 * (Math.pow(level, 2) + 1);
  const xpInLevel = xp - startXp;
  const xpNeeded = nextXp - startXp;
  const progress = Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));

  return {
    level,
    currentXp: xp,
    startXp,
    nextXp,
    xpInLevel,
    xpNeeded,
    remainingXp: Math.max(0, nextXp - xp),
    progress: Math.round(progress * 10) / 10
  };
}

/**
 * Returns unlocked perks and the immediate next upcoming perk milestone
 */
export function getPetPerks(level) {
  const currentLvl = parseInt(level) || 1;
  const unlocked = PET_MILESTONE_PERKS.filter(p => p.level <= currentLvl);
  const upcoming = PET_MILESTONE_PERKS.find(p => p.level > currentLvl);

  let nextPerk = null;
  if (upcoming) {
    nextPerk = {
      ...upcoming,
      levelsAway: upcoming.level - currentLvl
    };
  }

  return { unlocked, nextPerk };
}

/**
 * Parses raw pets object from live farm API, supporting both
 * nested categories (pets.common.Burro) and flat objects (pets.Burro).
 */
export function parseFarmPets(farmData) {
  if (!farmData) return [];
  const farm = farmData.farm || farmData;
  const rawPets = farm.pets;
  if (!rawPets || typeof rawPets !== 'object') return [];

  const petList = [];

  const processPetObj = (petName, petObj, categoryKey = 'common') => {
    if (!petObj || typeof petObj !== 'object') return;
    const name = petObj.name || petName;
    const knownMeta = KNOWN_PETS[name] || {
      id: 0,
      name,
      rarity: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
      emoji: '🐾',
      desc: 'Farm companion pet.'
    };

    const levelStats = calculatePetLevel(petObj.experience || 0);
    const perkInfo = getPetPerks(levelStats.level);

    petList.push({
      ...petObj,
      name,
      id: knownMeta.id,
      rarity: knownMeta.rarity || 'Common',
      emoji: knownMeta.emoji || '🐾',
      desc: knownMeta.desc,
      levelStats,
      perkInfo,
      category: categoryKey
    });
  };

  // Inspect keys
  for (const [key, val] of Object.entries(rawPets)) {
    if (val && typeof val === 'object') {
      if (val.experience !== undefined || val.name || val.requests) {
        // Flat entry
        processPetObj(key, val, 'common');
      } else {
        // Nested category group (e.g. common, rare, epic)
        for (const [subKey, subVal] of Object.entries(val)) {
          processPetObj(subKey, subVal, key);
        }
      }
    }
  }

  return petList;
}

import { getRecipe } from '../../data/recipes.js';

/**
 * Resolves food price in Flower / SFL from window.allPrices or recipe crafting cost
 */
export function getFoodPrice(foodName) {
  if (!foodName) return 0.05;
  const cleanKey = normalizeItemKey(foodName);

  if (typeof window !== 'undefined' && window.allPrices && typeof window.allPrices === 'object') {
    const matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (matchedKey) {
      const p = parseFloat(window.allPrices[matchedKey]);
      if (!isNaN(p) && p > 0) return p;
    }
  }

  // Calculate from recipe ingredients if available
  const recipe = getRecipe(foodName);
  if (recipe && recipe.ingredients) {
    let totalCost = 0;
    for (const [ingName, count] of Object.entries(recipe.ingredients)) {
      const ingClean = normalizeItemKey(ingName);
      let ingPrice = 0.005; // default fallback
      if (typeof window !== 'undefined' && window.allPrices) {
        const mKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === ingClean);
        if (mKey) ingPrice = parseFloat(window.allPrices[mKey]) || ingPrice;
      }
      totalCost += count * ingPrice;
    }
    if (totalCost > 0) return Math.round(totalCost * 10000) / 10000;
  }

  return PET_FOOD_FALLBACK_PRICES[foodName] || 0.05;
}

/**
 * Checks requested foods against current farm inventory and recipe ingredients
 */
export function checkFoodAvailability(requests, inventory = {}) {
  if (!requests || !Array.isArray(requests.food)) return [];

  const foodList = requests.food;
  const foodFed = Array.isArray(requests.foodFed) ? requests.foodFed : [];

  return foodList.map(foodName => {
    const isFed = foodFed.includes(foodName);
    const inBagCount = Math.floor(parseFloat(inventory?.[foodName] || 0));
    const price = getFoodPrice(foodName);

    // Recipe & ingredients lookup
    const recipe = getRecipe(foodName);
    let canCook = false;
    let ingredientDetails = [];

    if (recipe && recipe.ingredients) {
      let allIngredientsAvailable = true;
      for (const [ingName, requiredCount] of Object.entries(recipe.ingredients)) {
        const availableCount = Math.floor(parseFloat(inventory?.[ingName] || 0));
        const hasEnough = availableCount >= requiredCount;
        if (!hasEnough) allIngredientsAvailable = false;

        ingredientDetails.push({
          name: ingName,
          required: requiredCount,
          available: availableCount,
          hasEnough
        });
      }
      canCook = allIngredientsAvailable;
    }

    let status = 'missing';
    if (isFed) {
      status = 'fed';
    } else if (inBagCount >= 1) {
      status = 'ready';
    } else if (canCook) {
      status = 'can_cook';
    }

    return {
      foodName,
      isFed,
      inBagCount,
      price,
      status,
      recipe,
      canCook,
      ingredientDetails
    };
  });
}

/**
 * Formats relative time elapsed or remaining
 */
export function formatTimeSpan(ms) {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Formats interaction timers (2-hour nap petting cooldown, cheering, social XP)
 */
export function getPetInteractionStatus(pet) {
  const now = Date.now();
  const NAP_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

  // 1. Petting Nap
  let pettingReady = true;
  let pettingText = 'Ready to Pet!';
  let nextNapInText = '';

  if (pet.pettedAt && pet.pettedAt > 0) {
    const timeSincePet = now - pet.pettedAt;
    if (timeSincePet < NAP_COOLDOWN_MS) {
      pettingReady = false;
      const remainingMs = NAP_COOLDOWN_MS - timeSincePet;
      pettingText = `Petted ${formatTimeSpan(timeSincePet)} ago`;
      nextNapInText = `Next Nap in ${formatTimeSpan(remainingMs)}`;
    } else {
      pettingText = `Nap ready! (Last petted ${formatTimeSpan(timeSincePet)} ago)`;
    }
  }

  // 2. Cheering
  let cheerText = 'Never cheered';
  if (pet.cheeredAt && pet.cheeredAt > 0) {
    cheerText = `Cheered ${formatTimeSpan(now - pet.cheeredAt)} ago`;
  }

  // 3. Daily Social XP
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySocialXp = pet.dailySocialXP?.[todayStr] || 0;
  const socialCap = 50;

  return {
    pettingReady,
    pettingText,
    nextNapInText,
    cheerText,
    todaySocialXp,
    socialCap,
    socialPercent: Math.min(100, Math.round((todaySocialXp / socialCap) * 100))
  };
}

// ── Local Energy Feed Ledger Storage ──────────────────────────────────────────
const LEDGER_STORAGE_KEY = 'sfl_pet_energy_ledger';

export function getStoredEnergyLedger(farmId) {
  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (!farmId) return parsed;
    return parsed.filter(item => String(item.farmId) === String(farmId));
  } catch (_) {
    return [];
  }
}

export function recordFeedEvent(entry) {
  try {
    const existing = getStoredEnergyLedger();
    // Deduplicate by farmId + petName + fedAt
    const exists = existing.some(e => 
      String(e.farmId) === String(entry.farmId) &&
      e.petName === entry.petName &&
      e.fedAt === entry.fedAt
    );
    if (!exists) {
      existing.unshift(entry);
      // Keep up to 300 entries in local storage
      const trimmed = existing.slice(0, 300);
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch (_) {}
}
