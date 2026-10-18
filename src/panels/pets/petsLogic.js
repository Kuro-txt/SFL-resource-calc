import { 
  KNOWN_PETS, 
  PET_CATEGORIES, 
  FETCHING_ENERGY_COSTS, 
  PET_FOOD_FALLBACK_PRICES,
  NON_REQUESTED_FOODS
} from './petsData.js';
import { getRecipe } from '../../data/recipes.js';
import { normalizeItemKey } from '../../utils/formatters.js';

/**
 * Calculates level using the quadratic SFL formula:
 * Level 1: 0 XP
 * Level L >= 2: XP = 60 * ((L - 1)^2 + 1)
 */
export function calculatePetLevel(rawXp) {
  const xp = Math.max(0, parseFloat(rawXp) || 0);

  if (xp < 120) {
    const nextXp = 120;
    const progress = Math.min(100, Math.max(0, (xp / nextXp) * 100));
    return {
      level: 1,
      currentXp: xp,
      nextXp,
      remainingXp: Math.max(0, nextXp - xp),
      progress: Math.round(progress * 10) / 10
    };
  }

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
    remainingXp: Math.max(0, nextXp - xp),
    progress: Math.round(progress * 10) / 10
  };
}

/**
 * Level bonuses to energy per pet food consumed
 */
export function getEnergyBonusPerFood(level) {
  const lvl = parseInt(level) || 1;
  if (lvl >= 75) return 15;
  if (lvl >= 35) return 10;
  if (lvl >= 5) return 5;
  return 0;
}

/**
 * Base energy per food slot (Slot 0 = Easy, Slot 1 = Medium, Slot 2 = Hard)
 */
export function getBaseEnergyForSlot(slotIndex) {
  if (slotIndex === 0) return 40;  // Easy
  if (slotIndex === 1) return 70;  // Medium
  if (slotIndex === 2) return 110; // Hard
  return 80;                       // 4th/5th slot (NFT)
}

/**
 * Parses raw pets from live farm data
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
      category: 'Voyagers',
      rarity: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
      emoji: '🐾',
      desc: 'Farm companion pet.'
    };

    const levelStats = calculatePetLevel(petObj.experience || 0);
    const categoryInfo = PET_CATEGORIES[knownMeta.category] || PET_CATEGORIES.Voyagers;
    const energyBonus = getEnergyBonusPerFood(levelStats.level);

    petList.push({
      ...petObj,
      name,
      id: knownMeta.id,
      rarity: knownMeta.rarity || 'Common',
      emoji: knownMeta.emoji || '🐾',
      desc: knownMeta.desc,
      category: knownMeta.category || 'Voyagers',
      categoryInfo,
      levelStats,
      energyBonus
    });
  };

  for (const [key, val] of Object.entries(rawPets)) {
    if (val && typeof val === 'object') {
      if (val.experience !== undefined || val.name || val.requests) {
        processPetObj(key, val, 'common');
      } else {
        for (const [subKey, subVal] of Object.entries(val)) {
          processPetObj(subKey, subVal, key);
        }
      }
    }
  }

  return petList;
}

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

  // Calculate from recipe ingredients
  const recipe = getRecipe(foodName);
  if (recipe && recipe.ingredients) {
    let totalCost = 0;
    for (const [ingName, count] of Object.entries(recipe.ingredients)) {
      const ingClean = normalizeItemKey(ingName);
      let ingPrice = 0.005;
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
 * Checks requested foods against current farm inventory, evaluates Energy Gained and Cost / Energy
 */
export function checkFoodAvailability(requests, inventory = {}, petLevel = 1, auraMultiplier = 1) {
  if (!requests || !Array.isArray(requests.food)) return [];

  const foodList = requests.food;
  const foodFed = Array.isArray(requests.foodFed) ? requests.foodFed : [];
  const energyBonus = getEnergyBonusPerFood(petLevel);

  const slotTiers = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];

  const results = foodList.map((foodName, slotIdx) => {
    const isFed = foodFed.includes(foodName);
    const inBagCount = Math.floor(parseFloat(inventory?.[foodName] || 0));
    const price = getFoodPrice(foodName);

    // Energy calculation: (Base Slot Energy + Level Bonus) * Aura Multiplier
    const baseEnergy = getBaseEnergyForSlot(slotIdx);
    const totalEnergy = Math.round((baseEnergy + energyBonus) * auraMultiplier);
    const costPerEnergy = totalEnergy > 0 ? (price / totalEnergy) : 0;

    // Recipe ingredients check
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
      slotTier: slotTiers[slotIdx] || 'Custom',
      isFed,
      inBagCount,
      price,
      totalEnergy,
      costPerEnergy,
      isBestValue: false, // populated below
      status,
      recipe,
      canCook,
      ingredientDetails
    };
  });

  // Identify Best Value food among pending (unfed) requests
  const pending = results.filter(r => !r.isFed && r.costPerEnergy > 0);
  if (pending.length > 0) {
    let minCost = Infinity;
    let bestIdx = -1;
    results.forEach((r, idx) => {
      if (!r.isFed && r.costPerEnergy < minCost) {
        minCost = r.costPerEnergy;
        bestIdx = idx;
      }
    });
    if (bestIdx !== -1) {
      results[bestIdx].isBestValue = true;
    }
  }

  return results;
}

/**
 * Calculates Fetching Capacity & Yields based on pet Energy, Level, and Category
 */
export function calculateFetchingCapacity(energy = 0, level = 1, categoryName = 'Voyagers', isNft = false) {
  const currentEnergy = Math.max(0, parseInt(energy) || 0);
  const lvl = parseInt(level) || 1;
  const category = PET_CATEGORIES[categoryName] || PET_CATEGORIES.Voyagers;

  // Decimal yield bonus from levels
  let decimalBonus = 0;
  if (lvl >= 100) decimalBonus = 0.25;
  else if (lvl >= 50) decimalBonus = 0.15;
  else if (lvl >= 15) decimalBonus = 0.10;

  // Acorn yield (+1 Acorn at level 18)
  const acornBaseYield = (lvl >= 18 ? 2.0 : 1.0) + decimalBonus;
  const categoryBaseYield = 1.0 + decimalBonus;

  // Maximum fetches
  const acornFetches = Math.floor(currentEnergy / FETCHING_ENERGY_COSTS.Acorn);
  const categoryFetches = Math.floor(currentEnergy / FETCHING_ENERGY_COSTS.CategoryResource);
  const fossilFetches = lvl >= 20 ? Math.floor(currentEnergy / FETCHING_ENERGY_COSTS["Fossil Shell"]) : 0;
  const moonfurFetches = (isNft && lvl >= 12) ? Math.floor(currentEnergy / FETCHING_ENERGY_COSTS.Moonfur) : 0;

  return {
    currentEnergy,
    decimalBonus,
    acorn: {
      name: "Acorn",
      cost: FETCHING_ENERGY_COSTS.Acorn,
      maxFetches: acornFetches,
      yieldPerFetch: Math.round(acornBaseYield * 100) / 100,
      totalYield: Math.round(acornFetches * acornBaseYield * 10) / 10,
      energyRemaining: currentEnergy - (acornFetches * FETCHING_ENERGY_COSTS.Acorn)
    },
    category: {
      name: category.resource,
      categoryName: category.name,
      icon: category.icon,
      cost: FETCHING_ENERGY_COSTS.CategoryResource,
      maxFetches: categoryFetches,
      yieldPerFetch: Math.round(categoryBaseYield * 100) / 100,
      totalYield: Math.round(categoryFetches * categoryBaseYield * 10) / 10,
      energyRemaining: currentEnergy - (categoryFetches * FETCHING_ENERGY_COSTS.CategoryResource)
    },
    fossilShell: {
      name: "Fossil Shell",
      unlocked: lvl >= 20,
      cost: FETCHING_ENERGY_COSTS["Fossil Shell"],
      maxFetches: fossilFetches,
      totalYield: fossilFetches,
      energyRemaining: currentEnergy - (fossilFetches * FETCHING_ENERGY_COSTS["Fossil Shell"])
    },
    moonfur: {
      name: "Moonfur",
      unlocked: isNft && lvl >= 12,
      cost: FETCHING_ENERGY_COSTS.Moonfur,
      maxFetches: moonfurFetches,
      totalYield: moonfurFetches,
      energyRemaining: currentEnergy - (moonfurFetches * FETCHING_ENERGY_COSTS.Moonfur)
    }
  };
}

/**
 * Calculates remaining time until 00:00 UTC daily game reset
 */
export function getTimeUntilUtcReset() {
  const now = new Date();
  const nextReset = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  const diffMs = Math.max(0, nextReset.getTime() - now.getTime());

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return {
    hours,
    minutes,
    seconds,
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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
    const exists = existing.some(e => 
      String(e.farmId) === String(entry.farmId) &&
      e.petName === entry.petName &&
      e.fedAt === entry.fedAt
    );
    if (!exists) {
      existing.unshift(entry);
      const trimmed = existing.slice(0, 300);
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch (_) {}
}
