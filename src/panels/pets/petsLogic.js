import { 
  KNOWN_PETS, 
  PET_CATEGORIES, 
  PET_SPECIES,
  RESOURCE_ICONS,
  FETCHING_ENERGY_COSTS, 
  PET_FOOD_FALLBACK_PRICES,
  FETCHED_RESOURCE_FALLBACK_PRICES,
  NON_REQUESTED_FOODS,
  TIER_BASE_ENERGY,
  WALRUS_ONESIE_ENERGY_BOOST,
  PET_FOOD_DIFFICULTY_TIERS,
  PET_AURA_MULTIPLIERS
} from './petsData.js';
import { getRecipe, getBaseIngredients, canCraftRecipe } from '../../data/recipes.js';
import { normalizeItemKey } from '../../utils/formatters.js';

// ── Pet Aura Multipliers & State Management ───────────────────────────────────
const PET_AURAS_STORAGE_KEY = 'sfl_pet_auras';

export function getStoredPetAuras() {
  try {
    const raw = localStorage.getItem(PET_AURAS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

export function setPetAura(petName, auraKey) {
  try {
    const auras = getStoredPetAuras();
    auras[petName] = auraKey;
    localStorage.setItem(PET_AURAS_STORAGE_KEY, JSON.stringify(auras));
  } catch (_) {}
}

export function getPetAuraMultiplier(petName, petObj = null) {
  // 1. Check user override in localStorage
  const auras = getStoredPetAuras();
  if (petName && auras[petName]) {
    const key = String(auras[petName]).toLowerCase().replace(/aura/g, '').trim();
    if (PET_AURA_MULTIPLIERS[key]) {
      return PET_AURA_MULTIPLIERS[key].multiplier;
    }
    if (key === 'basic') return 1.5;
    if (key === 'epic') return 2.0;
    if (key === 'mega') return 3.0;
  }

  // 2. Auto-detect from petObj (supports petObj.traits.aura like 'Common Aura' from live API)
  if (petObj) {
    const rawAura = petObj.traits?.aura ?? petObj.aura ?? petObj.auraType ?? petObj.auraMultiplier;
    if (typeof rawAura === 'number' && rawAura > 0) {
      return rawAura;
    }
    if (typeof rawAura === 'string') {
      const lower = rawAura.toLowerCase().replace(/aura/g, '').trim();
      if (PET_AURA_MULTIPLIERS[lower]) {
        return PET_AURA_MULTIPLIERS[lower].multiplier;
      }
      if (lower === 'basic') return 1.5;
      if (lower === 'epic') return 2.0;
      if (lower === 'mega') return 3.0;
    }
  }

  return 1.0;
}

export function getPetAuraKey(petName, petObj = null) {
  const auras = getStoredPetAuras();
  if (petName && auras[petName]) {
    const key = String(auras[petName]).toLowerCase().replace(/aura/g, '').trim();
    if (PET_AURA_MULTIPLIERS[key]) return key;
    if (key === 'basic') return 'common';
    if (key === 'epic') return 'rare';
    if (key === 'mega') return 'mythic';
  }
  if (petObj) {
    const rawAura = petObj.traits?.aura ?? petObj.aura ?? petObj.auraType;
    if (typeof rawAura === 'string') {
      const lower = rawAura.toLowerCase().replace(/aura/g, '').trim();
      if (PET_AURA_MULTIPLIERS[lower]) return lower;
      if (lower === 'basic') return 'common';
      if (lower === 'epic') return 'rare';
      if (lower === 'mega') return 'mythic';
    }
    if (petObj.auraMultiplier === 1.5) return 'common';
    if (petObj.auraMultiplier === 2) return 'rare';
    if (petObj.auraMultiplier === 3) return 'mythic';
  }
  return 'none';
}

// ── Walrus Onesie Boost Helpers (+5 Energy) ──────────────────────────────────
const WALRUS_ONESIE_STORAGE_KEY = 'sfl_pets_walrus_onesie';

export function hasWalrusOnesieInWardrobe(farmData) {
  try {
    const farm = farmData?.farm || farmData || {};
    const wardrobe = farm.wardrobe || {};
    const inventory = farm.inventory || {};
    const bumpkinEquipped = farm.bumpkin?.equipped || farm.equipped || {};
    return Boolean(
      wardrobe['Walrus Onesie'] ||
      inventory['Walrus Onesie'] ||
      bumpkinEquipped.suit === 'Walrus Onesie'
    );
  } catch (_) {
    return false;
  }
}

export function isWalrusOnesieActive(farmData = null) {
  try {
    const stored = localStorage.getItem(WALRUS_ONESIE_STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    // Auto-detect from farm wardrobe if not explicitly set
    if (farmData || (typeof window !== 'undefined' && window.farmData)) {
      return hasWalrusOnesieInWardrobe(farmData || window.farmData);
    }
    return false;
  } catch (_) {
    return false;
  }
}

export function setWalrusOnesieActive(active) {
  try {
    localStorage.setItem(WALRUS_ONESIE_STORAGE_KEY, active ? 'true' : 'false');
  } catch (_) {}
}

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
 * Resolves difficulty tier and base energy for any food dish
 */
export function getFoodTierAndEnergy(foodName, slotIndex = 0) {
  if (foodName) {
    const rawLower = String(foodName).toLowerCase().trim();
    if (PET_FOOD_DIFFICULTY_TIERS[rawLower]) {
      return PET_FOOD_DIFFICULTY_TIERS[rawLower];
    }
    const cleanNoSpace = rawLower.replace(/[^a-z0-9]/g, '');
    for (const [key, val] of Object.entries(PET_FOOD_DIFFICULTY_TIERS)) {
      if (key.replace(/[^a-z0-9]/g, '') === cleanNoSpace) {
        return val;
      }
    }
  }

  const fallbackTiers = ['Easy', 'Medium', 'Hard'];
  const fallbackEnergies = [TIER_BASE_ENERGY.Easy, TIER_BASE_ENERGY.Medium, TIER_BASE_ENERGY.Hard];
  const tier = fallbackTiers[slotIndex] || 'Medium';
  const baseEnergy = fallbackEnergies[slotIndex] || TIER_BASE_ENERGY.Medium;

  return { tier, baseEnergy };
}

/**
 * Base energy per food slot (Slot 0 = Easy, Slot 1 = Medium, Slot 2 = Hard)
 */
export function getBaseEnergyForSlot(slotIndex) {
  if (slotIndex === 0) return TIER_BASE_ENERGY.Easy;   // 20
  if (slotIndex === 1) return TIER_BASE_ENERGY.Medium; // 100
  if (slotIndex === 2) return TIER_BASE_ENERGY.Hard;   // 300
  return TIER_BASE_ENERGY.Medium;
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
    const traitType = petObj.traits?.type;
    const isNft = categoryKey === 'nfts' || categoryKey === 'nft' || Boolean(traitType) || Boolean(petObj.traits);

    // Resolve metadata: check traits.type first for NFTs (e.g. Phoenix), then KNOWN_PETS[name]
    const speciesMeta = traitType && KNOWN_PETS[traitType] ? KNOWN_PETS[traitType] : null;
    const nameMeta = KNOWN_PETS[name] || null;
    const knownMeta = speciesMeta || nameMeta || {
      id: petObj.id || 0,
      name,
      species: traitType || 'Horse',
      category: 'Voyagers',
      rarity: isNft ? 'NFT' : (categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)),
      emoji: isNft ? '🐉' : '🐾',
      desc: isNft ? 'NFT Companion Pet.' : 'Farm companion pet.'
    };

    const species = traitType || knownMeta.species || 'Horse';
    const rarity = isNft ? 'NFT' : (knownMeta.rarity || 'Common');
    const category = knownMeta.category || 'Voyagers';
    const categoryInfo = PET_CATEGORIES[category] || PET_CATEGORIES.Voyagers;
    const emoji = knownMeta.emoji || (isNft ? '🐉' : '🐾');
    const desc = knownMeta.desc || (isNft ? 'NFT Companion Pet.' : 'Farm companion pet.');

    const levelStats = calculatePetLevel(petObj.experience || 0);
    const categoryInfoResolved = PET_CATEGORIES[category] || categoryInfo || PET_CATEGORIES.Voyagers;
    const energyBonus = getEnergyBonusPerFood(levelStats.level);
    const auraMultiplier = getPetAuraMultiplier(name, petObj);
    const auraKey = getPetAuraKey(name, petObj);

    petList.push({
      ...petObj,
      name,
      id: petObj.id || knownMeta.id,
      species,
      rarity,
      emoji,
      desc,
      category,
      categoryInfo: categoryInfoResolved,
      traits: petObj.traits || null,
      levelStats,
      energyBonus,
      auraMultiplier,
      auraKey
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
 * Supports recursive sub-recipe pricing (e.g. Cheese needed for Blue Cheese)
 */
export function getFoodPrice(foodName, visited = new Set()) {
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
  if (recipe && recipe.ingredients && !visited.has(foodName)) {
    visited.add(foodName);
    let totalCost = 0;
    for (const [ingName, count] of Object.entries(recipe.ingredients)) {
      const ingClean = normalizeItemKey(ingName);
      let ingPrice = 0;
      if (typeof window !== 'undefined' && window.allPrices) {
        const mKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === ingClean);
        if (mKey) ingPrice = parseFloat(window.allPrices[mKey]) || 0;
      }
      // If no market price, resolve from sub-recipe crafting cost
      if (ingPrice <= 0) {
        const subRecipe = getRecipe(ingName);
        if (subRecipe) {
          ingPrice = getFoodPrice(ingName, new Set(visited));
        }
      }
      if (ingPrice <= 0) {
        ingPrice = PET_FOOD_FALLBACK_PRICES[ingName] || 0.005;
      }
      totalCost += count * ingPrice;
    }
    if (totalCost > 0) return Math.round(totalCost * 10000) / 10000;
  }

  return PET_FOOD_FALLBACK_PRICES[foodName] || 0.05;
}

/**
 * Checks requested foods against current farm inventory, evaluates Energy Gained and Cost / Energy.
 * Base energy is multiplied by auraMultiplier (None: 1.0, Common: 1.5, Rare: 2.0, Mythic: 3.0),
 * and intermediate recipe crafting (e.g. Cheese -> Blue Cheese) is evaluated.
 */
export function checkFoodAvailability(requests, inventory = {}, petLevel = 1, auraMultiplier = 1, walrusOnesieActive = null) {
  if (!requests || !Array.isArray(requests.food)) return [];

  const foodList = requests.food;
  const foodFed = Array.isArray(requests.foodFed) ? requests.foodFed : [];
  const energyBonus = getEnergyBonusPerFood(petLevel);
  const isWalrus = walrusOnesieActive !== null ? Boolean(walrusOnesieActive) : isWalrusOnesieActive();
  const walrusBonus = isWalrus ? WALRUS_ONESIE_ENERGY_BOOST : 0;
  const aura = parseFloat(auraMultiplier) || 1.0;

  const results = foodList.map((foodName, slotIdx) => {
    const isFed = foodFed.includes(foodName);
    const inBagCount = Math.floor(parseFloat(inventory?.[foodName] || 0));
    const price = getFoodPrice(foodName);

    // Energy calculation: (Base Tier Energy [20/100/300] * Aura Multiplier) + Level Bonus + Walrus Onesie
    const { tier, baseEnergy } = getFoodTierAndEnergy(foodName, slotIdx);
    const baseWithAura = Math.round(baseEnergy * aura);
    const totalEnergy = baseWithAura + energyBonus + walrusBonus;
    const costPerEnergy = totalEnergy > 0 ? (price / totalEnergy) : 0;
    const costPer100Energy = totalEnergy > 0 ? ((price / totalEnergy) * 100) : 0;

    // Recipe ingredients check (supports sub-recipes like Cheese -> Blue Cheese)
    const recipe = getRecipe(foodName);
    let canCook = false;
    let ingredientDetails = [];

    if (recipe && recipe.ingredients) {
      let allIngredientsAvailable = true;
      for (const [ingName, requiredCount] of Object.entries(recipe.ingredients)) {
        const availableCount = Math.floor(parseFloat(inventory?.[ingName] || 0));
        let hasEnough = availableCount >= requiredCount;
        let subRecipeInfo = null;

        // If player doesn't have enough of the intermediate crafted item, check its raw recipe ingredients
        if (!hasEnough) {
          const subRecipe = getRecipe(ingName);
          if (subRecipe && subRecipe.ingredients) {
            const missingCount = requiredCount - availableCount;
            const subBases = getBaseIngredients(ingName, missingCount);
            let canCraftSub = true;
            const subMissingDetails = [];

            for (const [bName, bReq] of Object.entries(subBases)) {
              const bAvail = Math.floor(parseFloat(inventory?.[bName] || 0));
              if (bAvail < bReq) {
                canCraftSub = false;
                subMissingDetails.push(`${bName}: ${bAvail}/${bReq}`);
              }
            }

            if (canCraftSub) {
              hasEnough = true;
              subRecipeInfo = `Craft from ${Object.entries(subBases).map(([bn, bq]) => `${bq} ${bn}`).join(', ')}`;
            } else {
              subRecipeInfo = `Need ${subMissingDetails.join(', ')}`;
            }
          }
        }

        if (!hasEnough) allIngredientsAvailable = false;

        ingredientDetails.push({
          name: ingName,
          required: requiredCount,
          available: availableCount,
          hasEnough,
          subRecipeInfo
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
      slotTier: tier,
      baseEnergy,
      baseWithAura,
      auraMultiplier: aura,
      walrusBonus,
      energyBonus,
      isFed,
      inBagCount,
      price,
      totalEnergy,
      costPerEnergy,
      costPer100Energy,
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
 * Calculates Fetching Capacity & Yields based on specific pet Species, Level, and Energy
 * Uses official unlock levels from https://sfl.world/info/pets
 */
export function calculateFetchingCapacity(energy = 0, level = 1, categoryName = 'Voyagers', isNft = false, petName = null, petSpecies = null) {
  const currentEnergy = Math.max(0, parseInt(energy) || 0);
  const lvl = parseInt(level) || 1;
  const category = PET_CATEGORIES[categoryName] || PET_CATEGORIES.Voyagers;

  // Decimal yield bonus from levels (+0.1 at 15, +0.15 at 50, +0.25 at 100)
  let decimalBonus = 0;
  if (lvl >= 100) decimalBonus = 0.25;
  else if (lvl >= 50) decimalBonus = 0.15;
  else if (lvl >= 15) decimalBonus = 0.10;

  // Acorn yield (+1 Acorn at level 18)
  const acornBaseYield = (lvl >= 18 ? 2.0 : 1.0) + decimalBonus;
  const categoryBaseYield = 1.0 + decimalBonus;

  // Resolve species from petSpecies, petName or fallback
  let speciesKey = petSpecies || null;
  if (!speciesKey && petName && KNOWN_PETS[petName]) {
    speciesKey = KNOWN_PETS[petName].species || petName;
  }
  if (!speciesKey && petName && PET_SPECIES[petName]) {
    speciesKey = petName;
  }
  const speciesConfig = speciesKey ? PET_SPECIES[speciesKey] : null;

  let availableFetches = [];

  if (speciesConfig && Array.isArray(speciesConfig.fetches)) {
    speciesConfig.fetches.forEach(f => {
      const isUnlocked = lvl >= f.level;
      let yieldPerFetch = 1.0;
      if (f.resource === 'Acorn') {
        yieldPerFetch = acornBaseYield;
      } else if (f.energyCost === 200) {
        yieldPerFetch = categoryBaseYield;
      } else {
        yieldPerFetch = 1.0;
      }
      yieldPerFetch = Math.round(yieldPerFetch * 100) / 100;

      const maxFetches = isUnlocked ? Math.floor(currentEnergy / f.energyCost) : 0;
      const totalYield = Math.round(maxFetches * yieldPerFetch * 10) / 10;
      const unitPrice = getResourceUnitPrice(f.resource);
      // SFL value generated per 100 energy: (yieldPerFetch * price) / (cost / 100)
      const sflPer100Energy = (yieldPerFetch * unitPrice) / (f.energyCost / 100);

      availableFetches.push({
        resource: f.resource,
        name: f.resource,
        icon: f.icon || RESOURCE_ICONS[f.resource] || '📦',
        levelReq: f.level,
        energyCost: f.energyCost,
        isUnlocked,
        maxFetches,
        yieldPerFetch,
        totalYield,
        unitPrice,
        sflPer100Energy: Math.round(sflPer100Energy * 10000) / 10000
      });
    });
  } else {
    // Fallback if species not found in catalog
    const acornFetches = Math.floor(currentEnergy / 100);
    const catFetches = Math.floor(currentEnergy / 200);
    const fossilFetches = lvl >= 20 ? Math.floor(currentEnergy / 300) : 0;
    const catRes = category?.resource || "Ruffroot";

    availableFetches = [
      {
        resource: "Acorn",
        name: "Acorn",
        icon: "🌰",
        levelReq: 1,
        energyCost: 100,
        isUnlocked: true,
        maxFetches: acornFetches,
        yieldPerFetch: Math.round(acornBaseYield * 100) / 100,
        totalYield: Math.round(acornFetches * acornBaseYield * 10) / 10,
        unitPrice: getResourceUnitPrice("Acorn"),
        sflPer100Energy: Math.round((acornBaseYield * getResourceUnitPrice("Acorn")) * 10000) / 10000
      },
      {
        resource: catRes,
        name: catRes,
        icon: category?.icon || "🌿",
        levelReq: 3,
        energyCost: 200,
        isUnlocked: lvl >= 3,
        maxFetches: catFetches,
        yieldPerFetch: Math.round(categoryBaseYield * 100) / 100,
        totalYield: Math.round(catFetches * categoryBaseYield * 10) / 10,
        unitPrice: getResourceUnitPrice(catRes),
        sflPer100Energy: Math.round(((categoryBaseYield * getResourceUnitPrice(catRes)) / 2) * 10000) / 10000
      },
      {
        resource: "Fossil Shell",
        name: "Fossil Shell",
        icon: "🐚",
        levelReq: 20,
        energyCost: 300,
        isUnlocked: lvl >= 20,
        maxFetches: fossilFetches,
        yieldPerFetch: 1.0,
        totalYield: fossilFetches,
        unitPrice: getResourceUnitPrice("Fossil Shell"),
        sflPer100Energy: Math.round((getResourceUnitPrice("Fossil Shell") / 3) * 10000) / 10000
      }
    ];
  }

  // Find Best Resource to Fetch by Price among currently UNLOCKED items
  const unlocked = availableFetches.filter(f => f.isUnlocked);
  unlocked.sort((a, b) => b.sflPer100Energy - a.sflPer100Energy);
  const bestFetch = unlocked[0] || null;

  const allEnergyPlan = calculateOptimalEnergyAllocation(availableFetches, currentEnergy);

  return {
    currentEnergy,
    decimalBonus,
    fetches: availableFetches,
    bestFetch,
    allEnergyPlan
  };
}

/**
 * Calculates optimal allocation of ALL available pet energy to maximize SFL profit.
 * Prioritizes highest SFL/100⚡ unlocked fetch, and allocates remainder down to Acorns.
 */
export function calculateOptimalEnergyAllocation(availableFetches, currentEnergy) {
  let energyLeft = Math.max(0, parseInt(currentEnergy) || 0);
  if (energyLeft < 100 || !Array.isArray(availableFetches)) {
    return {
      plan: [],
      totalSfl: 0,
      energyUsed: 0,
      energyRemaining: energyLeft,
      summaryText: 'Need 100⚡'
    };
  }

  // Sort unlocked fetches descending by sflPer100Energy
  const unlocked = availableFetches
    .filter(f => f.isUnlocked && f.energyCost > 0)
    .sort((a, b) => b.sflPer100Energy - a.sflPer100Energy);

  const plan = [];
  let totalSfl = 0;
  let energyUsed = 0;

  unlocked.forEach(f => {
    if (energyLeft >= f.energyCost) {
      const count = Math.floor(energyLeft / f.energyCost);
      if (count > 0) {
        const yieldAmount = Math.round(count * f.yieldPerFetch * 10) / 10;
        const sflEarned = count * f.yieldPerFetch * f.unitPrice;
        energyLeft -= (count * f.energyCost);
        energyUsed += (count * f.energyCost);
        totalSfl += sflEarned;
        plan.push({
          resource: f.resource,
          icon: f.icon,
          count,
          yieldAmount,
          sflEarned
        });
      }
    }
  });

  const summaryText = plan.length > 0
    ? plan.map(p => `${p.count}x ${p.icon} (${p.yieldAmount})`).join(' + ')
    : 'None available';

  return {
    plan,
    totalSfl: Math.round(totalSfl * 10000) / 10000,
    energyUsed,
    energyRemaining: energyLeft,
    summaryText
  };
}

/**
 * Resolves unit price for fetched resources from window.allPrices or fallback catalog
 */
export function getResourceUnitPrice(resourceName) {
  if (!resourceName) return 0.02;
  const cleanKey = normalizeItemKey(resourceName);

  if (typeof window !== 'undefined' && window.allPrices && typeof window.allPrices === 'object') {
    const matchedKey = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (matchedKey) {
      const p = parseFloat(window.allPrices[matchedKey]);
      if (!isNaN(p) && p > 0) return p;
    }
  }

  return FETCHED_RESOURCE_FALLBACK_PRICES[resourceName] || 0.02;
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
      Number(e.fedAt) === Number(entry.fedAt)
    );
    if (!exists) {
      existing.unshift(entry);
      const trimmed = existing.slice(0, 300);
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(trimmed));

      // Asynchronously sync new feed event to TiDB Cloud if opted in
      if (isPetTrackerOptedIn()) {
        syncFeedEventToCloud(entry);
      }
    }
  } catch (_) {}
}

// ── TiDB Cloud Ledger Synchronization ─────────────────────────────────────────
export async function fetchCloudPetLedger(farmId) {
  const cleanFarmId = farmId || (typeof window !== 'undefined' ? (window.farmData?.farmId || window.currentFarmId) : null);
  if (!cleanFarmId || cleanFarmId === 'preview') return [];

  try {
    const res = await fetch(`/api/pets?farmId=${cleanFarmId}&limit=100`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data && Array.isArray(data.events)) {
      const localLedger = getStoredEnergyLedger(cleanFarmId);
      const merged = [...localLedger];
      
      data.events.forEach(cloudEvt => {
        const exists = merged.some(m => 
          String(m.farmId) === String(cloudEvt.farmId) &&
          m.petName === cloudEvt.petName &&
          Number(m.fedAt) === Number(cloudEvt.fedAt)
        );
        if (!exists) {
          merged.push(cloudEvt);
        }
      });

      merged.sort((a, b) => (Number(b.fedAt) || 0) - (Number(a.fedAt) || 0));
      const trimmed = merged.slice(0, 300);
      try {
        localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(trimmed));
      } catch (_) {}

      return trimmed;
    }
  } catch (err) {
    console.warn("Notice: Could not load pet ledger from TiDB Cloud:", err.message);
  }
  return [];
}

export async function syncFeedEventToCloud(entry) {
  if (!entry || !entry.farmId || entry.farmId === 'preview') return;
  if (!isPetTrackerOptedIn()) return;

  try {
    await fetch('/api/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmId: entry.farmId,
        entry,
        optIn: isPetTrackerOptedIn(),
        walrusOnesie: isWalrusOnesieActive()
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    console.warn("Notice: TiDB pet feed event background upload notice:", err.message);
  }
}

// ── Opt-In State Management (Supabase profiles & TiDB) ─────────────────────────
const PET_OPT_IN_KEY = 'sfl_pet_tracker_opt_in';

export function isPetTrackerOptedIn() {
  try {
    return localStorage.getItem(PET_OPT_IN_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

export function setPetTrackerOptIn(optedIn) {
  try {
    localStorage.setItem(PET_OPT_IN_KEY, optedIn ? 'true' : 'false');

    // 1. Persist to Supabase profiles if authenticated user
    if (typeof window !== 'undefined' && window.currentUser && window.supabaseClient) {
      window.supabaseClient
        .from('profiles')
        .update({ pet_tracker_opt_in: Boolean(optedIn) })
        .eq('id', window.currentUser.id)
        .then(({ error }) => {
          if (error) console.warn("Notice: Supabase pet_tracker_opt_in notice:", error.message);
        })
        .catch(err => console.warn("Notice: Supabase pet opt-in notice:", err.message));
    }

    // 2. Persist to TiDB Cloud preferences
    const farmId = (typeof window !== 'undefined') ? (window.farmData?.farmId || window.currentFarmId) : null;
    if (farmId && farmId !== 'preview') {
      fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          farmId, 
          optIn: Boolean(optedIn),
          walrusOnesie: isWalrusOnesieActive()
        }),
        signal: AbortSignal.timeout(8000)
      }).catch(() => {});
    }
  } catch (_) {}
}

