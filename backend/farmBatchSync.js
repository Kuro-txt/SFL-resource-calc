const axios = require('axios');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const BATCH_DELAY_MS = 11000; // 11s safe spacing between SFL API requests
const SFL_API_URL = 'https://api.sunflower-land.com/community/getFarms';
const SFL_API_KEY = process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || process.env.API_KEY || process.env.SUNFLOWER_API_KEY || process.env.VITE_SFL_API_KEY || "";

function normalizeFarmId(rawId) {
  if (rawId === null || rawId === undefined) return null;
  const parsed = Math.floor(Number(String(rawId).trim()));
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : null;
}

function getBatchHeaders(customApiKey = '') {
  const keyToUse = (customApiKey && customApiKey.trim()) || (SFL_API_KEY && SFL_API_KEY.trim());
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://sunflower-land.com/',
    'Origin': 'https://sunflower-land.com'
  };

  if (keyToUse) {
    headers['x-api-key'] = keyToUse;
    headers['Authorization'] = `Bearer ${keyToUse}`;
  }

  return headers;
}

/**
 * Execute a single HTTP POST request to the SFL batch API.
 */
async function postBatch(ids, attempt = 1, customApiKey = '') {
  try {
    const response = await axios.post(
      SFL_API_URL,
      { ids }, // Must be array of pure numeric integers
      {
        headers: getBatchHeaders(customApiKey),
        timeout: 25000
      }
    );
    return response.data || { farms: {}, skipped: [] };
  } catch (err) {
    const status = err.response?.status;

    if (status === 401) {
      console.error('❌ [401 Unauthorized] SFL API key invalid or farm VIP expired. Check SFL_API_KEY.');
      throw err;
    }

    if (status === 429 && attempt <= 2) {
      const waitTimeMs = 15000;
      console.warn(`⚠️ [429 Throttle] SFL rate limit hit. Waiting ${waitTimeMs / 1000}s before retry (Attempt ${attempt}/2)...`);
      await delay(waitTimeMs);
      return postBatch(ids, attempt + 1, customApiKey);
    }

    console.error(`❌ Batch request failed (HTTP ${status || err.code || err.message}) for ${ids.length} IDs.`);
    return { farms: {}, skipped: ids };
  }
}

/**
 * Fetch a batch of farm IDs with recursive binary-split retry for skipped IDs.
 * Separates payload cap drops (recovered) from non-existent farms (permanently skipped).
 */
async function fetchFarmsWithSplitRetry(ids, customApiKey = '') {
  if (!ids || ids.length === 0) return {};

  const data = await postBatch(ids, 1, customApiKey);
  const farms = data.farms || {};
  const skipped = Array.isArray(data.skipped) ? data.skipped : [];

  // Binary-split if farms were skipped and we have more than 1 ID
  if (skipped.length > 0 && ids.length > 1) {
    console.log(`ℹ️ [Split-Retry] ${skipped.length} farms skipped in batch of ${ids.length}. Binary splitting to recover payload drops...`);
    const half = Math.ceil(skipped.length / 2);
    const subBatches = [skipped.slice(0, half), skipped.slice(half)].filter(b => b.length > 0);

    for (const subBatch of subBatches) {
      await delay(BATCH_DELAY_MS); // Maintain 11s spacing between split requests
      const recoveredFarms = await fetchFarmsWithSplitRetry(subBatch, customApiKey);
      for (const [key, val] of Object.entries(recoveredFarms)) {
        farms[key] = val;
      }
    }
  } else if (skipped.length > 0 && ids.length === 1) {
    console.warn(`⚠️ Farm #${ids[0]} permanently skipped by SFL (farm does not exist or is inactive).`);
  }

  return farms;
}

/**
 * Top-level batch orchestrator:
 * - Deduplicates and normalizes farm IDs
 * - Chunks into groups of 20
 * - Executes binary-split retry for payload drops
 * - Paces major batches with an 11s gap
 * - Returns dictionary indexed strictly by string Farm ID
 */
async function fetchAllFarmsBatched(rawFarmIds, customApiKey = '') {
  const allFarms = {};
  if (!Array.isArray(rawFarmIds) || rawFarmIds.length === 0) {
    return allFarms;
  }

  // Deduplicate and extract valid numeric integers
  const uniqueNumericIds = Array.from(
    new Set(
      rawFarmIds
        .map(id => normalizeFarmId(id))
        .filter(Boolean)
        .map(Number)
    )
  );

  if (uniqueNumericIds.length === 0) {
    console.warn("⚠️ [Batch Fetcher] No valid numeric farm IDs to fetch.");
    return allFarms;
  }

  const CHUNK_SIZE = 20;
  const totalBatches = Math.ceil(uniqueNumericIds.length / CHUNK_SIZE);
  console.log(`🚜 [Batch Fetcher] Starting sync for ${uniqueNumericIds.length} unique farms in ${totalBatches} batch(es) of max ${CHUNK_SIZE}...`);

  const startTime = Date.now();

  for (let i = 0; i < uniqueNumericIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueNumericIds.slice(i, i + CHUNK_SIZE);
    const batchNum = Math.floor(i / CHUNK_SIZE) + 1;

    console.log(`🚜 [Batch ${batchNum}/${totalBatches}] Requesting ${chunk.length} farms: [${chunk.slice(0, 5).join(', ')}${chunk.length > 5 ? '...' : ''}]`);

    const batchFarms = await fetchFarmsWithSplitRetry(chunk, customApiKey);
    const returnedCount = Object.keys(batchFarms).length;
    console.log(`✅ [Batch ${batchNum}/${totalBatches}] SFL returned ${returnedCount} farms.`);

    // Strictly index by standardized string key
    for (const [farmId, farmObj] of Object.entries(batchFarms)) {
      const cleanKey = normalizeFarmId(farmId);
      if (cleanKey && farmObj && typeof farmObj === 'object') {
        allFarms[cleanKey] = farmObj;
      }
    }

    // 11s gap between major batches (skip after the last batch)
    if (i + CHUNK_SIZE < uniqueNumericIds.length) {
      console.log(`⏳ [Batch Throttle] Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await delay(BATCH_DELAY_MS);
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalRetrieved = Object.keys(allFarms).length;
  console.log(`📦 [Batch Fetcher Complete] Retrieved ${totalRetrieved}/${uniqueNumericIds.length} farms in ${elapsedSec}s.`);

  return allFarms;
}

module.exports = {
  fetchAllFarmsBatched,
  normalizeFarmId,
  BATCH_DELAY_MS
};
