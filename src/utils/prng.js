/**
 * Sunflower Land Deterministic PRNG Engine
 * Extracted directly from official Sunflower Land client logic (src/lib/prng.ts and src/lib/utils/stringToInteger.ts)
 */

/**
 * 32-bit Java-style string hash used in SFL client
 * @param {string} str - Critical hit or boost name
 * @returns {number} 32-bit unsigned integer
 */
export function stringToInteger(str) {
  if (!str || typeof str !== 'string') return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * 32-bit MurmurHash3 algorithm to generate a deterministic pseudo-random number between 0 and 1.
 * Matches Sunflower Land's prng() implementation.
 *
 * @param {Object} params
 * @param {number} params.farmId - The farm ID
 * @param {number} params.itemId - The numeric item ID (or node ID) from KNOWN_IDS
 * @param {number} params.counter - Cumulative action counter from farmActivity
 * @param {string} params.criticalHitName - The boost or wearable critical hit name
 * @returns {number} Random float between 0 and 1
 */
export function prng({ farmId, itemId, counter, criticalHitName }) {
  const fId = Number(farmId) || 0;
  const iId = Number(itemId) || 0;
  const cnt = Number(counter) || 0;
  const criticalHitNameHash = stringToInteger(criticalHitName || '');

  // Combine seed, stream, and index into a 32-bit state with imul
  const seed =
    (Math.imul(fId, 0x85ebca6b) +
      Math.imul(iId, 0x9e3779b9) +
      Math.imul(cnt, 0x27d4eb2f) +
      Math.imul(criticalHitNameHash, 0x517cc1b7)) >>>
    0;

  // Mix bits (32-bit MurmurHash3 style)
  let t = seed ^ (seed >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);

  const value = ((t = t ^ (t >>> 15)) >>> 0) / (2 ** 32);
  return value;
}

/**
 * Check if an action triggers a critical hit / proc based on % threshold
 * @param {Object} params
 * @param {number} params.farmId - Farm ID
 * @param {number} params.itemId - Item ID
 * @param {number} params.counter - Action counter
 * @param {number} params.chance - Chance percentage (e.g. 15 for 15%)
 * @param {string} params.criticalHitName - Boost name
 * @returns {{ proc: boolean, roll: number, value: number }}
 */
export function prngChance({ farmId, itemId, counter, chance, criticalHitName }) {
  const value = prng({ farmId, itemId, counter, criticalHitName });
  const roll = value * 100;
  const proc = roll < Number(chance);
  return { proc, roll, value };
}

/**
 * Find the next counter that will trigger a proc
 * @param {Object} params
 * @param {number} params.farmId
 * @param {number} params.itemId
 * @param {number} params.currentCounter
 * @param {number} params.chance
 * @param {string} params.criticalHitName
 * @param {number} [params.maxLookahead=500]
 * @returns {{ nextCounter: number, distance: number, roll: number } | null}
 */
export function findNextProc({ farmId, itemId, currentCounter, chance, criticalHitName, maxLookahead = 500 }) {
  const start = Number(currentCounter) || 0;
  const ch = Number(chance) || 0;
  if (ch <= 0) return null;

  for (let i = 0; i <= maxLookahead; i++) {
    const checkCounter = start + i;
    const { proc, roll } = prngChance({ farmId, itemId, counter: checkCounter, chance: ch, criticalHitName });
    if (proc) {
      return {
        nextCounter: checkCounter,
        distance: i, // 0 means the current/immediate action will proc!
        roll
      };
    }
  }
  return null;
}

/**
 * Generate a forecast timeline of upcoming rolls
 * @param {Object} params
 * @param {number} params.farmId
 * @param {number} params.itemId
 * @param {number} params.startCounter
 * @param {number} [params.count=50]
 * @param {number} params.chance
 * @param {string} params.criticalHitName
 * @returns {Array<{ actionIndex: number, counter: number, roll: number, proc: boolean }>}
 */
export function forecastProcs({ farmId, itemId, startCounter, count = 50, chance, criticalHitName }) {
  const start = Number(startCounter) || 0;
  const numRolls = Math.min(Math.max(1, Number(count) || 50), 500);
  const ch = Number(chance) || 0;

  const results = [];
  for (let i = 0; i < numRolls; i++) {
    const currentCnt = start + i;
    const { proc, roll } = prngChance({ farmId, itemId, counter: currentCnt, chance: ch, criticalHitName });
    results.push({
      actionIndex: i + 1,
      counter: currentCnt,
      roll: parseFloat(roll.toFixed(2)),
      proc
    });
  }
  return results;
}

/**
 * Simulate batch crafting of N items starting from a specific counter
 * @param {Object} params
 * @param {number} params.farmId
 * @param {number} params.itemId
 * @param {number} params.startCounter
 * @param {number} params.batchSize
 * @param {number} params.chance
 * @param {string} params.criticalHitName
 * @param {number} [params.baseYield=1]
 * @param {number} [params.procMultiplier=2] - multiplier on proc (e.g. 2 for 2x double)
 * @param {number} [params.procBonus=1] - bonus on proc if additive (e.g. +1)
 * @param {boolean} [params.isAdditive=false]
 * @returns {{ totalYield: number, procCount: number, procs: Array<number>, items: Array<{ craftNumber: number, counter: number, proc: boolean, yield: number }> }}
 */
export function simulateBatchCraft({
  farmId,
  itemId,
  startCounter,
  batchSize,
  chance,
  criticalHitName,
  baseYield = 1,
  procMultiplier = 2,
  procBonus = 1,
  isAdditive = false
}) {
  const size = Math.max(1, Number(batchSize) || 1);
  const start = Number(startCounter) || 0;
  const ch = Number(chance) || 0;

  let totalYield = 0;
  let procCount = 0;
  const procs = [];
  const items = [];

  for (let i = 0; i < size; i++) {
    const currentCnt = start + i;
    const { proc, roll } = prngChance({ farmId, itemId, counter: currentCnt, chance: ch, criticalHitName });
    let itemYield = baseYield;

    if (proc) {
      procCount++;
      procs.push(i + 1);
      if (isAdditive) {
        itemYield += procBonus;
      } else {
        itemYield *= procMultiplier;
      }
    }

    totalYield += itemYield;
    items.push({
      craftNumber: i + 1,
      counter: currentCnt,
      roll: parseFloat(roll.toFixed(2)),
      proc,
      yield: itemYield
    });
  }

  return {
    totalYield,
    procCount,
    procs,
    items
  };
}
