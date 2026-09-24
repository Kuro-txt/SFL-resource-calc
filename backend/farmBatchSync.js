const axios = require('axios');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const BATCH_DELAY_MS = 11000; // 11s safe spacing between SFL API requests
const SFL_API_URL = 'https://api.sunflower-land.com/community/getFarms';
const SFL_API_KEY = process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || process.env.API_KEY || process.env.SUNFLOWER_API_KEY || process.env.VITE_SFL_API_KEY || "";

/**
 * Standardize farm ID into a clean numeric string.
 * Keeps all numeric integers (standard and large).
 */
function normalizeFarmId(rawId) {
  if (rawId === null || rawId === undefined) return null;
  const str = String(rawId).trim();
  if (!/^\d+$/.test(str)) return null;
  if (/^0+$/.test(str)) return null;
  return str;
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
      { ids: ids.map(Number) },
      {
        headers: getBatchHeaders(customApiKey),
        timeout: 35000 // 35 seconds gives SFL sufficient time for 20-farm JSON payloads
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
      const waitTimeMs = 25000 * attempt;
      console.warn(`⚠️ [429 Throttle] SFL rate limit hit. Waiting ${waitTimeMs / 1000}s before retry (Attempt ${attempt}/2)...`);
      await delay(waitTimeMs);
      return postBatch(ids, attempt + 1, customApiKey);
    }

    const errDetail = status ? `HTTP ${status}` : (err.code || err.message);
    console.error(`❌ Batch request failed (${errDetail}) for ${ids.length} ID(s).`);
    return { farms: {}, skipped: ids, error: errDetail };
  }
}

/**
 * Two-Phase Batch Fetcher:
 * - Phase 1 (Fast Full Sweep): Process all major batches of 20 sequentially without blocking/splitting.
 *   Immediately saves all returned farms. Any skipped/failed IDs (and >16 digit IDs) are deferred.
 * - Phase 2 (Targeted Deferred Retry): Attempts recovery for deferred IDs in isolated micro-batches or 1-by-1.
 *   If any still fail or SFL skips them, they are cleanly reported and skipped without crashing other farms.
 */
async function fetchAllFarmsBatched(rawFarmIds, customApiKey = '') {
  const allFarms = {};
  if (!Array.isArray(rawFarmIds) || rawFarmIds.length === 0) {
    return allFarms;
  }

  // 1. Deduplicate & standardize IDs
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

  const startTime = Date.now();

  // Separate standard IDs for Phase 1 vs atypical (>16 digits) for Phase 2
  const standardIds = [];
  const deferredQueue = new Set();

  for (const id of uniqueNumericIds) {
    // IDs with > 16 digits exceed standard SFL limits and crash SFL 20-farm queries with HTTP 500.
    // Instead of discarding them, route directly to Phase 2 to test in isolation!
    if (String(id).length > 16 || !Number.isSafeInteger(id)) {
      console.log(`ℹ️ [Deferred Queue] Farm #${id} (>16 digits) routed to Phase 2 for isolated retrieval.`);
      deferredQueue.add(id);
    } else {
      standardIds.push(id);
    }
  }

  const CHUNK_SIZE = 20;
  const totalBatches = Math.ceil(standardIds.length / CHUNK_SIZE);
  console.log(`🚜 [Batch Fetcher] Phase 1: Starting sweep for ${standardIds.length} farms in ${totalBatches} batch(es) of max ${CHUNK_SIZE}...`);

  // ── PHASE 1: Fast Full Sweep ───────────────────────────────────────────────
  for (let i = 0; i < standardIds.length; i += CHUNK_SIZE) {
    const chunk = standardIds.slice(i, i + CHUNK_SIZE);
    const batchNum = Math.floor(i / CHUNK_SIZE) + 1;

    console.log(`🚜 [Batch ${batchNum}/${totalBatches}] Requesting ${chunk.length} farms: [${chunk.slice(0, 5).join(', ')}${chunk.length > 5 ? '...' : ''}]`);

    const data = await postBatch(chunk, 1, customApiKey);
    const batchFarms = data.farms || {};
    const returnedCount = Object.keys(batchFarms).length;

    // Save all successfully returned farms
    for (const [farmId, farmObj] of Object.entries(batchFarms)) {
      const cleanKey = normalizeFarmId(farmId);
      if (cleanKey && farmObj && typeof farmObj === 'object') {
        allFarms[cleanKey] = farmObj;
      }
    }

    // Identify skipped or dropped IDs
    const returnedIdSet = new Set(Object.keys(batchFarms).map(Number));
    const missingInBatch = chunk.filter(id => !returnedIdSet.has(id));

    if (missingInBatch.length > 0) {
      console.warn(`⚠️ [Batch ${batchNum}/${totalBatches}] ${missingInBatch.length}/${chunk.length} farm(s) not returned (${data.error || 'skipped by SFL'}). Deferring to Phase 2 retry.`);
      for (const id of missingInBatch) {
        deferredQueue.add(id);
      }
    } else {
      console.log(`✅ [Batch ${batchNum}/${totalBatches}] SFL returned all ${returnedCount} farms.`);
    }

    // 11s gap between major batches
    if (i + CHUNK_SIZE < standardIds.length) {
      console.log(`⏳ [Batch Throttle] Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await delay(BATCH_DELAY_MS);
    }
  }

  const phase1Count = Object.keys(allFarms).length;
  console.log(`📊 [Phase 1 Complete] Retrieved ${phase1Count}/${standardIds.length} farms. Deferred queue: ${deferredQueue.size} farm(s).`);

  // ── PHASE 2: Targeted Deferred Retry ───────────────────────────────────────
  const permanentlySkipped = [];

  if (deferredQueue.size > 0) {
    const deferredList = Array.from(deferredQueue);
    console.log(`🔄 [Phase 2 Deferred Retry] Starting recovery for ${deferredList.length} deferred farm(s)...`);

    // Cooldown before Phase 2 to ensure SFL rate limit and connection buffers are clear
    console.log(`⏳ [Phase 2 Cooldown] Waiting 15s before deferred retries...`);
    await delay(15000);

    // Group deferred IDs into small micro-chunks of 5 (or 1 if atypical)
    const microChunks = [];
    let currentChunk = [];

    for (const id of deferredList) {
      // If atypical (>16 digits), test in isolated chunk of 1
      if (String(id).length > 16 || !Number.isSafeInteger(id)) {
        if (currentChunk.length > 0) {
          microChunks.push(currentChunk);
          currentChunk = [];
        }
        microChunks.push([id]);
      } else {
        currentChunk.push(id);
        if (currentChunk.length >= 5) {
          microChunks.push(currentChunk);
          currentChunk = [];
        }
      }
    }
    if (currentChunk.length > 0) microChunks.push(currentChunk);

    for (let m = 0; m < microChunks.length; m++) {
      const microChunk = microChunks[m];
      console.log(`🔄 [Phase 2 Micro-batch ${m + 1}/${microChunks.length}] Retrying ${microChunk.length} farm(s): [${microChunk.join(', ')}]`);

      const data = await postBatch(microChunk, 1, customApiKey);
      const recoveredFarms = data.farms || {};
      const returnedIds = new Set(Object.keys(recoveredFarms).map(Number));

      for (const [farmId, farmObj] of Object.entries(recoveredFarms)) {
        const cleanKey = normalizeFarmId(farmId);
        if (cleanKey && farmObj && typeof farmObj === 'object') {
          allFarms[cleanKey] = farmObj;
        }
      }

      // Check which IDs in this micro-chunk still failed
      const stillMissing = microChunk.filter(id => !returnedIds.has(id));

      if (stillMissing.length > 0) {
        // If microChunk had more than 1 ID, test them individually (1-by-1) to isolate the bad ID
        if (microChunk.length > 1) {
          for (const singleId of stillMissing) {
            await delay(BATCH_DELAY_MS);
            console.log(`🔍 [Phase 2 Isolated] Checking individual Farm #${singleId}...`);
            const singleData = await postBatch([singleId], 1, customApiKey);
            const singleFarm = singleData.farms?.[String(singleId)] || singleData.farms?.[singleId];
            if (singleFarm && typeof singleFarm === 'object') {
              console.log(`✅ [Phase 2 Isolated] Farm #${singleId} recovered!`);
              allFarms[String(singleId)] = singleFarm;
            } else {
              console.warn(`⚠️ Farm #${singleId} permanently skipped by SFL (farm does not exist or is inactive).`);
              permanentlySkipped.push(singleId);
            }
          }
        } else {
          // Was already tested as 1 ID and failed
          console.warn(`⚠️ Farm #${stillMissing[0]} permanently skipped by SFL (farm does not exist or is inactive).`);
          permanentlySkipped.push(stillMissing[0]);
        }
      }

      if (m + 1 < microChunks.length) {
        await delay(BATCH_DELAY_MS);
      }
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalRetrieved = Object.keys(allFarms).length;
  const phase2Recovered = totalRetrieved - phase1Count;

  console.log(`📦 [Batch Fetcher Complete] Retrieved ${totalRetrieved}/${uniqueNumericIds.length} farms in ${elapsedSec}s (Phase 1: ${phase1Count}, Phase 2 Recovered: ${phase2Recovered}, Skipped: ${permanentlySkipped.length}).`);
  if (permanentlySkipped.length > 0) {
    console.warn(`⚠️ The following ${permanentlySkipped.length} farm ID(s) could not be loaded: [${permanentlySkipped.join(', ')}]`);
  }

  return allFarms;
}

module.exports = {
  fetchAllFarmsBatched,
  normalizeFarmId,
  BATCH_DELAY_MS
};
