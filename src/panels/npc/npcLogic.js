import { getBettyUnitPrice, normalizeItemKey } from '../../utils/formatters.js';
import { FLOWER_RECIPES } from './npcData.js';
import { CROP_FLOWER_PRICES, getCoinFlowerRatio } from '../../config/constants.js';

export function getNpcData(npcOrId, liveNpcData) {
  if (!liveNpcData || typeof liveNpcData !== 'object') return {};

  const unwrapped = liveNpcData.npcs || liveNpcData.farm?.npcs || liveNpcData;

  const idStr = typeof npcOrId === 'object' ? (npcOrId.id || npcOrId.name || '') : String(npcOrId || '');
  const nameStr = typeof npcOrId === 'object' ? (npcOrId.name || '') : '';

  if (idStr && unwrapped[idStr]) return unwrapped[idStr];
  if (nameStr && unwrapped[nameStr]) return unwrapped[nameStr];

  const cleanTargetId = idStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanTargetName = nameStr.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (let key in unwrapped) {
    const cleanKey = String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
    if ((cleanTargetId && cleanKey === cleanTargetId) || (cleanTargetName && cleanKey === cleanTargetName)) {
      return unwrapped[key] || {};
    }
  }

  return {};
}

export function getNpcFriendship(npcId, liveNpcData) {
  const data = getNpcData(npcId, liveNpcData);
  return data.friendship || {};
}

/**
 * Resolves unit price of a crop or base ingredient from live market, Betty, or fallback.
 */
export function getIngredientUnitPrice(cleanKey) {
  if (typeof window !== 'undefined' && window.allPrices) {
    const match = Object.keys(window.allPrices).find(k => normalizeItemKey(k) === cleanKey);
    if (match) {
      const p = parseFloat(window.allPrices[match]) || 0;
      if (p > 0) return p > 100 ? p / 1000 : p;
    }
  }

  const betty = getBettyUnitPrice(cleanKey);
  if (betty !== null && betty > 0) return betty;

  if (CROP_FLOWER_PRICES[cleanKey] !== undefined) {
    return CROP_FLOWER_PRICES[cleanKey];
  }

  return 0.005;
}

/**
 * Computes the crafting / breeding cost of a flower based on its recipe:
 * coins (divided by ratio) + required crops + recursive sub-flower costs.
 */
export function computeFlowerCost(flowerName, visiting = new Set()) {
  if (!flowerName) return 0;
  const cleanKey = normalizeItemKey(flowerName);

  if (visiting.has(cleanKey)) return 0; // Prevent circular dependencies
  visiting.add(cleanKey);

  const recipe = Object.entries(FLOWER_RECIPES).find(([k]) => normalizeItemKey(k) === cleanKey)?.[1];
  if (!recipe) {
    return getIngredientUnitPrice(cleanKey);
  }

  let totalCost = 0;
  const ratio = typeof getCoinFlowerRatio === 'function' ? getCoinFlowerRatio() : 1000;

  for (const [ingredient, qty] of Object.entries(recipe)) {
    const numQty = typeof qty === 'number' ? qty : parseFloat(qty) || 0;
    if (numQty <= 0) continue;

    if (ingredient === 'coins' || ingredient === 'coin') {
      totalCost += (isFinite(ratio) && ratio > 0 ? (numQty / ratio) : 0);
    } else {
      const ingClean = normalizeItemKey(ingredient);
      const isSubFlower = Object.keys(FLOWER_RECIPES).some(k => normalizeItemKey(k) === ingClean);
      if (isSubFlower) {
        totalCost += numQty * computeFlowerCost(ingredient, new Set(visiting));
      } else {
        totalCost += numQty * getIngredientUnitPrice(ingClean);
      }
    }
  }

  return totalCost;
}

export function getItemFlowerPrice(cleanKey) {
  const cost = computeFlowerCost(cleanKey);
  if (cost > 0) return cost;

  const bettyPrice = getBettyUnitPrice(cleanKey);
  if (bettyPrice !== null && bettyPrice > 0) {
    return bettyPrice;
  }

  return 0;
}

export function calculateMilestoneProgress(npc, points) {
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

export function normalizeTimestampMs(ts) {
  const num = parseInt(ts || 0, 10);
  if (!num || isNaN(num) || num <= 0) return 0;
  return num < 10000000000 ? num * 1000 : num;
}

export function checkIsGiftedToday(timestamp, nowMs = Date.now()) {
  const ts = normalizeTimestampMs(timestamp);
  if (!ts) return false;
  const now = new Date(nowMs);
  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return ts >= startOfTodayUtc;
}

export function formatGiftedAt(timestamp, nowMs = Date.now()) {
  const ts = normalizeTimestampMs(timestamp);
  if (!ts) return 'Never gifted';
  const diffMs = nowMs - ts;
  if (diffMs < 0) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
