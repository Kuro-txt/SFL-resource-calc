/**
 * server.js — Express app entry point & route wiring
 *
 * Business logic lives in backend/:
 *   backend/db.js             — TiDB pool & table setup
 *   backend/prices.js         — CROP_FLOWER_PRICES & getFlowerUnitPrice
 *   backend/farmApi.js        — SFL API fetching utilities
 *   backend/baselineService.js — processBaselineSnapshot()
 *   backend/yieldService.js   — processYieldCalculation(), backfillDailyYields()
 *   backend/tradeSync.js      — fetchMarketplaceTradesWithRetry(), processAutoSyncTrades()
 */

const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const path    = require('path');
const fs      = require('fs');
const cron    = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

// ── Auto-load local .env in development if present (.env* is gitignored) ─────
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
} catch (_) {}

// ── Backend service modules ────────────────────────────────────────────────
// Note: TiDB is used exclusively for marketplace trades in backend/tradeSync.js & api/trades.js
const { getTiDBPool, recordExchangeRateInCloud } = require('./backend/db');
const { CROP_FLOWER_PRICES }                     = require('./backend/prices');
const { fetchFarmFullDataWithRetry, getSflHeaders, formatNftItem } = require('./backend/farmApi');
const { processBaselineSnapshot }                = require('./backend/baselineService');
const { processYieldCalculation, backfillDailyYields, repairMissingBaselines, aggregateCompletedWeeks, aggregateCompletedMonths, pruneOldLogs, recalculateWeekForUser, getWeekRangeUTC } = require('./backend/yieldService');
const { processAutoSyncTrades }                  = require('./backend/tradeSync');
const { fetchMarketplaceActivity }               = require('./backend/marketplaceService');

// ── App & Supabase setup ───────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
if (!supabase) {
  console.warn("⚠️ [Server Startup Notice] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables.");
}

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY || '';
if (!CRON_SECRET_KEY) {
  console.warn("⚠️ [Security Warning] CRON_SECRET_KEY is not set in environment variables. Trigger endpoints requiring authorization will reject calls.");
}

const SFL_API_KEY = process.env.SFL_API_KEY || process.env.COMMUNITY_API_KEY || process.env.API_KEY || process.env.SUNFLOWER_API_KEY || process.env.VITE_SFL_API_KEY || "";
if (!SFL_API_KEY) {
  console.warn("⚠️ [Server Startup Warning] SFL_API_KEY is not set. Batch cron farm sync will fail with 401 until set in Render environment variables.");
} else {
  console.log("🔑 SFL_API_KEY detected for batch farm cron sync.");
}

const SFL_WORLD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://sfl.world/'
};

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Disable browser caching for HTML + JS so mobile gets fresh code
app.use((req, res, next) => {
  if (req.url.endsWith('.html') || req.url.endsWith('.js') || req.url === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.static(path.join(__dirname)));

// ── Auth helper ────────────────────────────────────────────────────────────
function verifyCronAuth(req) {
  // If strict mode is NOT explicitly enabled, allow external cron triggers (e.g. cron-job.org)
  // This prevents 401 Unauthorized errors when CRON_SECRET_KEY is unset or when calling without a query param.
  if (process.env.STRICT_CRON_AUTH !== 'true') {
    return true;
  }
  // When STRICT_CRON_AUTH=true is explicitly configured, enforce matching CRON_SECRET_KEY
  if (!CRON_SECRET_KEY) return false;
  const key = req.query.key || 
              req.query.secret || 
              req.query.token || 
              req.query.apiKey || 
              req.headers['x-cron-key'] || 
              (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '');
  return Boolean(key) && key === CRON_SECRET_KEY;
}

// ── Server In-Memory Cache with TTL & Deduplication ────────────────────────
const serverCache = new Map();

function getServerCache(key, ttlMs) {
  const entry = serverCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    serverCache.delete(key);
    return null;
  }
  return entry.data;
}

function setServerCache(key, data) {
  if (serverCache.size > 1000) {
    const oldestKey = serverCache.keys().next().value;
    serverCache.delete(oldestKey);
  }
  serverCache.set(key, { data, timestamp: Date.now() });
}

function clearServerCache(prefix) {
  if (!prefix) {
    serverCache.clear();
    return;
  }
  for (const k of serverCache.keys()) {
    if (k.startsWith(prefix)) serverCache.delete(k);
  }
}

// ── Simple API proxy routes ────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  let dbStatus = 'unconfigured';
  let farmDiagnostics = null;

  if (supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) dbStatus = 'error: ' + error.message;
      else dbStatus = 'connected (' + (data?.length || 0) + ')';

      const checkFarmId = (req.query.farmId || '').trim();
      if (checkFarmId) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, farm_id, created_at')
          .eq('farm_id', checkFarmId);

        const targetUserIds = (profs || []).map(p => p.id);

        const { count: baselineCount } = await supabase
          .from('preharvest_baselines')
          .select('id', { count: 'exact', head: true })
          .eq('farm_id', checkFarmId);

        let yieldCount = 0;
        if (targetUserIds.length > 0) {
          const { count } = await supabase
            .from('daily_yields')
            .select('id', { count: 'exact', head: true })
            .in('user_id', targetUserIds);
          yieldCount = count || 0;
        }

        farmDiagnostics = {
          farmId: checkFarmId,
          profileFound: targetUserIds.length > 0,
          profileCount: targetUserIds.length,
          profiles: profs || [],
          profileError: pErr ? pErr.message : null,
          baselineCount: baselineCount || 0,
          yieldCount
        };
      }
    } catch (e) {
      dbStatus = 'exception: ' + e.message;
    }
  }

  res.status(200).json({
    status: 'OK',
    hasServiceKey,
    hasCronKey: Boolean(CRON_SECRET_KEY),
    strictCronAuth: process.env.STRICT_CRON_AUTH === 'true',
    db: dbStatus,
    farm: farmDiagnostics
  });
});

app.get('/api/config', (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

app.get('/api/get-data', async (req, res) => {
  const force = req.query.force === 'true';
  const customApiKey = (req.query.apiKey || req.headers['x-api-key'] || '').trim();
  try {
    const data = await fetchMarketplaceActivity(customApiKey, force);
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(data.pricesPayload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price data', details: err.message });
  }
});

app.get('/api/get-exchange', async (req, res) => {
  const force = req.query.force === 'true';
  const cacheKey = 'sfl_exchange';
  if (!force) {
    const cached = getServerCache(cacheKey, 60 * 1000); // 60s
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
  }
  try {
    const response = await axios.get('https://sfl.world/api/v1.1/exchange', {
      headers: SFL_WORLD_HEADERS,
      timeout: 10000
    });
    if (response.data && (response.data.gems || response.data.sfl)) {
      setServerCache(cacheKey, response.data);

      // Save exchange rate snapshot to cloud asynchronously (throttled to 15m)
      try {
        const pool = getTiDBPool();
        if (pool && response.data) {
          recordExchangeRateInCloud(pool, response.data).catch(() => {});
        }
      } catch (_) {}

      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('X-Cache', 'MISS');
      return res.json(response.data);
    }
    throw new Error('Invalid exchange payload from sfl.world');
  } catch (err) {
    const stale = serverCache.get(cacheKey)?.data;
    if (stale) {
      res.setHeader('X-Cache', 'STALE');
      return res.json(stale);
    }
    const flPrice = 0.1403;
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({
      sfl: { usd: flPrice },
      pol: { usd: 0.18 },
      gems: {
        "100": { gem: 100, usd: 1.29, sfl: 9.19, sfl1: 0.0919, pol: 1.93 },
        "650": { gem: 650, usd: 6.49, sfl: 46.25, sfl1: 0.0711, pol: 9.73 },
        "1350": { gem: 1350, usd: 12.99, sfl: 92.58, sfl1: 0.0685, pol: 19.48 },
        "2800": { gem: 2800, usd: 25.99, sfl: 185.24, sfl1: 0.0661, pol: 38.98 },
        "7400": { gem: 7400, usd: 64.99, sfl: 463.22, sfl1: 0.0626, pol: 97.48 },
        "15500": { gem: 15500, usd: 129.99, sfl: 926.51, sfl1: 0.0597, pol: 194.98 },
        "200000": { gem: 200000, usd: 1299.99, sfl: 9265.78, sfl1: 0.0463, pol: 1949.98 }
      },
      fallback: true
    });
  }
});

app.get('/api/get-farm', async (req, res) => {
  const { farmId, apiKey, force } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });
  const cleanFarmId = String(farmId).trim();
  const cleanApiKey = apiKey ? String(apiKey).trim() : '';
  const cacheKey = `farm_${cleanFarmId}_${cleanApiKey ? 'vip' : 'anon'}`;

  if (force !== 'true') {
    const cached = getServerCache(cacheKey, 30 * 1000); // 30s
    if (cached) {
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
  }

  try {
    const farmData = await fetchFarmFullDataWithRetry(
      cleanFarmId, 3, cleanApiKey
    );
    const result = { success: true, farm: farmData };
    setServerCache(cacheKey, result);
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    const stale = serverCache.get(cacheKey)?.data;
    if (stale) {
      res.setHeader('X-Cache', 'STALE');
      return res.json(stale);
    }
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

app.get('/api/get-land', async (req, res) => {
  const { farmId, force } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });
  const cleanFarmId = String(farmId).trim();
  const cacheKey = `land_${cleanFarmId}`;

  if (force !== 'true') {
    const cached = getServerCache(cacheKey, 180 * 1000); // 3 min
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=180');
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
  }

  try {
    const response = await axios.get(
      `https://sfl.world/api/v1/land/${encodeURIComponent(cleanFarmId)}`,
      { headers: SFL_WORLD_HEADERS, timeout: 20000 }
    );
    const result = { success: true, land: response.data };
    setServerCache(cacheKey, result);
    res.setHeader('Cache-Control', 'public, max-age=180');
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    const stale = serverCache.get(cacheKey)?.data;
    if (stale) {
      res.setHeader('X-Cache', 'STALE');
      return res.json(stale);
    }
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch land data', details: err.message });
  }
});

app.get('/api/get-marketplace', async (req, res) => {
  const { farmId, apiKey, force } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });
  const cleanFarmId = String(farmId).trim();
  const cleanApiKey = apiKey ? String(apiKey).trim() : '';
  const cacheKey = `marketplace_${cleanFarmId}`;

  if (force !== 'true') {
    const cached = getServerCache(cacheKey, 60 * 1000); // 60s
    if (cached) {
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
  }

  try {
    const response = await axios.get(
      `https://api.sunflower-land.com/community/data?type=marketplaceProfile&farmId=${encodeURIComponent(cleanFarmId)}`,
      { headers: getSflHeaders(cleanApiKey), timeout: 15000 }
    );
    const result = { success: true, data: response.data };
    setServerCache(cacheKey, result);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    const stale = serverCache.get(cacheKey)?.data;
    if (stale) {
      res.setHeader('X-Cache', 'STALE');
      return res.json(stale);
    }
    res.status(err.response?.status || 500).json({ error: err.response?.data?.error || err.message });
  }
});

app.all('/api/trades', async (req, res) => {
  try {
    const { default: tradesHandler } = await import('./api/trades.js');
    return tradesHandler(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process trades request', details: err.message });
  }
});

app.get(['/api/nfts', '/api/nft'], async (req, res) => {
  const force = req.query.force === 'true';
  const customApiKey = (req.query.apiKey || req.headers['x-api-key'] || '').trim();
  try {
    const data = await fetchMarketplaceActivity(customApiKey, force);
    res.setHeader('Cache-Control', 'public, max-age=600');
    return res.json(data.nftsPayload);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch live NFTs: ${err.message}` });
  }
});

// ── Concurrency locks for background cron tasks ────────────────────────────
let isSnapshotRunning = false;
let isYieldRunning = false;
let isTradesSyncRunning = false;
let isBackfillRunning = false;

function isAnySyncRunning() {
  return isSnapshotRunning || isYieldRunning || isTradesSyncRunning || isBackfillRunning;
}

// ── Cron trigger routes ────────────────────────────────────────────────────
app.get('/api/trigger-daily-baseline', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { type, sync } = req.query;

  if (isAnySyncRunning()) {
    return res.status(200).json({ success: true, status: 'already_running', message: 'A sync task is already in progress. Syncs run 1-by-1 sequentially.' });
  }

  if (sync === 'true') {
    try {
      if (type === 'baseline') {
        isSnapshotRunning = true;
        const result = await processBaselineSnapshot(supabase);
        return res.status(200).json({ success: true, message: 'Baseline snapshot completed.', result });
      } else if (type === 'yield') {
        isYieldRunning = true;
        const result = await processYieldCalculation(supabase);
        return res.status(200).json({ success: true, message: 'Yield calculation completed.', result });
      } else if (type === 'trades') {
        isTradesSyncRunning = true;
        const result = await processAutoSyncTrades(supabase);
        return res.status(200).json({ success: true, message: 'Trades auto-sync completed.', result });
      } else if (type === 'weekly') {
        const result = await aggregateCompletedWeeks(supabase, req.query.force === 'true');
        return res.status(200).json({ success: true, message: 'Weekly aggregation completed.', result });
      } else if (type === 'monthly') {
        const result = await aggregateCompletedMonths(supabase, req.query.force === 'true');
        return res.status(200).json({ success: true, message: 'Monthly aggregation completed.', result });
      } else if (type === 'prune') {
        const result = await pruneOldLogs(supabase);
        return res.status(200).json({ success: true, message: 'Pruning completed.', result });
      } else {
        return res.status(400).json({ error: "Invalid type. Use 'type=baseline', 'type=yield', 'type=trades', 'type=weekly', 'type=monthly', 'type=prune', or 'type=repair'." });
      }
    } catch (err) {
      console.error(`Manual trigger error (${type}):`, err.message);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      isSnapshotRunning = false;
      isYieldRunning = false;
      isTradesSyncRunning = false;
    }
  }

  // Non-blocking trigger (fire and return immediately with concurrency guard)
  if (type === 'baseline') {
    isSnapshotRunning = true;
    res.status(200).json({ success: true, status: 'started', message: 'Baseline snapshot triggered in background.' });
    processBaselineSnapshot(supabase).catch(err => console.error('Snapshot Error:', err.message)).finally(() => { isSnapshotRunning = false; });
  } else if (type === 'yield') {
    isYieldRunning = true;
    res.status(200).json({ success: true, status: 'started', message: 'Yield calculation triggered in background.' });
    processYieldCalculation(supabase).catch(err => console.error('Yield Error:', err.message)).finally(() => { isYieldRunning = false; });
  } else if (type === 'trades') {
    isTradesSyncRunning = true;
    res.status(200).json({ success: true, status: 'started', message: 'Trades auto-sync triggered in background.' });
    processAutoSyncTrades(supabase).catch(err => console.error('Trades Error:', err.message)).finally(() => { isTradesSyncRunning = false; });
  } else if (type === 'weekly') {
    res.status(200).json({ success: true, status: 'started', message: 'Weekly aggregation triggered in background.' });
    aggregateCompletedWeeks(supabase, req.query.force === 'true').catch(err => console.error('Weekly Error:', err.message));
  } else if (type === 'monthly') {
    res.status(200).json({ success: true, status: 'started', message: 'Monthly aggregation triggered in background.' });
    aggregateCompletedMonths(supabase, req.query.force === 'true').catch(err => console.error('Monthly Error:', err.message));
  } else if (type === 'prune') {
    res.status(200).json({ success: true, status: 'started', message: 'Log pruning triggered in background.' });
    pruneOldLogs(supabase).catch(err => console.error('Prune Error:', err.message));
  } else if (type === 'repair') {
    repairMissingBaselines(supabase)
      .then(res => console.log('Baseline Repair Complete:', res))
      .catch(err => console.error('Baseline Repair Error:', err.message));
    return res.status(200).json({ success: true, message: 'Baseline repair started in background.' });
  } else {
    return res.status(400).json({ error: "Invalid type. Use 'type=baseline', 'type=yield', 'type=trades', 'type=weekly', 'type=monthly', 'type=prune', or 'type=repair'." });
  }
});

app.get('/api/cron/snapshot', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (isAnySyncRunning()) {
    return res.status(200).json({ success: true, status: 'already_running', message: 'A sync task is already in progress. Syncs run 1-by-1 sequentially.' });
  }

  if (req.query.sync === 'true') {
    try {
      isSnapshotRunning = true;
      const result = await processBaselineSnapshot(supabase);
      return res.status(200).json({ success: true, message: 'Baseline snapshot completed.', result });
    } catch (err) {
      console.error('Snapshot Error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      isSnapshotRunning = false;
    }
  }

  isSnapshotRunning = true;
  res.status(200).json({ success: true, status: 'started', message: 'Baseline snapshot started in background.' });
  processBaselineSnapshot(supabase)
    .catch(err => console.error('Snapshot Error:', err.message))
    .finally(() => { isSnapshotRunning = false; });
});

app.get(['/api/cron/2230utc-yield', '/api/cron/22utc-yield', '/api/cron/yield'], async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (isAnySyncRunning()) {
    return res.status(200).json({ success: true, status: 'already_running', message: 'A sync task is already in progress. Syncs run 1-by-1 sequentially.' });
  }

  if (req.query.sync === 'true') {
    try {
      isYieldRunning = true;
      const result = await processYieldCalculation(supabase);
      return res.status(200).json({ success: true, message: 'Yield calculation completed.', result });
    } catch (err) {
      console.error('Yield Error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      isYieldRunning = false;
    }
  }

  isYieldRunning = true;
  res.status(200).json({ success: true, status: 'started', message: 'Yield calculation started in background.' });
  processYieldCalculation(supabase)
    .catch(err => console.error('Yield Error:', err.message))
    .finally(() => { isYieldRunning = false; });
});

app.get('/api/cron/sync-trades', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (isAnySyncRunning()) {
    return res.status(200).json({ success: true, status: 'already_running', message: 'A sync task is already in progress. Syncs run 1-by-1 sequentially.' });
  }

  if (req.query.sync === 'true') {
    try {
      isTradesSyncRunning = true;
      const result = await processAutoSyncTrades(supabase);
      return res.status(200).json({ success: true, message: 'Marketplace trades auto-sync completed.', result });
    } catch (err) {
      console.error('Auto-sync trades Error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      isTradesSyncRunning = false;
    }
  }

  isTradesSyncRunning = true;
  res.status(200).json({ success: true, status: 'started', message: 'Marketplace trades auto-sync started in background.' });
  processAutoSyncTrades(supabase)
    .catch(err => console.error('Auto-sync trades Error:', err.message))
    .finally(() => { isTradesSyncRunning = false; });
});

app.get('/api/cron/backfill-yields', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (isAnySyncRunning()) {
    return res.status(200).json({ success: true, status: 'already_running', message: 'A sync task is already in progress. Syncs run 1-by-1 sequentially.' });
  }

  if (req.query.sync === 'true') {
    try {
      isBackfillRunning = true;
      const result = await backfillDailyYields(supabase);
      return res.status(200).json(result);
    } catch (err) {
      console.error('Backfill Error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    } finally {
      isBackfillRunning = false;
    }
  }

  isBackfillRunning = true;
  res.status(200).json({ success: true, status: 'started', message: 'Yield backfill started in background.' });
  backfillDailyYields(supabase)
    .catch(err => console.error('Backfill Error:', err.message))
    .finally(() => { isBackfillRunning = false; });
});

app.get('/api/cron/repair-baselines', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (req.query.sync === 'true') {
    try {
      const result = await repairMissingBaselines(supabase);
      return res.status(200).json({ success: true, message: 'Baseline repair completed.', result });
    } catch (err) {
      console.error('Repair Error:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  res.status(200).json({ success: true, status: 'started', message: 'Baseline repair started in background.' });
  repairMissingBaselines(supabase)
    .then(r => console.log('Baseline repair result:', r))
    .catch(err => console.error('Repair Error:', err.message));
});

// ── /api/baselines — Serve preharvest baselines history from Supabase ────────
app.get('/api/baselines', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { farmId, userId, limit = 35 } = req.query;

  try {
    const requestedUserId = userId ? String(userId).trim() : '';
    const cleanFarmId = farmId ? String(farmId).trim() : '';
    const targetUserIds = [];
    if (requestedUserId) targetUserIds.push(requestedUserId);

    if (cleanFarmId) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('farm_id', cleanFarmId);
      if (Array.isArray(profiles)) {
        profiles.forEach(p => {
          if (p.id && !targetUserIds.includes(p.id)) targetUserIds.push(p.id);
        });
      }
    }

    let query = supabase
      .from('preharvest_baselines')
      .select('snapshot_date, stock, farm_activity, user_id, farm_id')
      .order('snapshot_date', { ascending: false })
      .limit(parseInt(limit, 10) || 35);

    if (cleanFarmId && targetUserIds.length > 0) {
      query = query.or(`farm_id.eq.${cleanFarmId},user_id.in.(${targetUserIds.join(',')})`);
    } else if (cleanFarmId) {
      query = query.eq('farm_id', cleanFarmId);
    } else if (targetUserIds.length > 0) {
      query = query.in('user_id', targetUserIds);
    } else {
      return res.status(200).json({ success: true, data: [] });
    }

    const { data, error } = await query;
    if (error) throw error;

    const seenDates = new Set();
    const uniqueBaselines = [];
    for (const b of (data || [])) {
      if (!seenDates.has(b.snapshot_date)) {
        seenDates.add(b.snapshot_date);
        uniqueBaselines.push(b);
      }
    }

    return res.status(200).json({ success: true, data: uniqueBaselines });
  } catch (err) {
    console.warn("Supabase /api/baselines notice:", err.message);
    return res.status(200).json({ success: true, data: [] });
  }
});

// ── /api/yields — Serve daily yield history exclusively from Supabase ─────────
app.get('/api/yields', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { farmId, userId } = req.query;

  try {
    const requestedUserId = userId ? String(userId).trim() : '';
    const cleanFarmId = farmId ? String(farmId).trim() : '';
    const targetUserIds = [];
    if (requestedUserId) targetUserIds.push(requestedUserId);

    if (cleanFarmId) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('farm_id', cleanFarmId);
      if (Array.isArray(profiles)) {
        profiles.forEach(p => {
          if (p.id && !targetUserIds.includes(p.id)) targetUserIds.push(p.id);
        });
      }
    }

    if (targetUserIds.length > 0) {
      const { data: supaRows, error: sErr } = await supabase
        .from('daily_yields')
        .select('*')
        .in('user_id', targetUserIds)
        .gt('total_count', 0)
        .order('yield_date', { ascending: false })
        .limit(100);

      if (!sErr && Array.isArray(supaRows) && supaRows.length > 0) {
        supaRows.sort((a, b) => {
          if (requestedUserId) {
            if (a.user_id === requestedUserId && b.user_id !== requestedUserId) return -1;
            if (b.user_id === requestedUserId && a.user_id !== requestedUserId) return 1;
          }
          return (b.total_count || 0) - (a.total_count || 0);
        });

        const formatted = supaRows.map(r => {
          let crops = Array.isArray(r.crops) ? r.crops : (typeof r.crops === 'string' ? JSON.parse(r.crops || '[]') : []);
          const acts = Array.isArray(r.crop_activity_yields) ? r.crop_activity_yields : (typeof r.crop_activity_yields === 'string' ? JSON.parse(r.crop_activity_yields || '[]') : []);

          if (!crops.length && acts.length) {
            crops = acts.map(c => ({
              name: c.crop || c.name || 'Crop',
              qty:     parseFloat(c.totalProduced || c.qty || c.harvestCount || 0),
              flowers: parseFloat(c.netFlowers    || c.flowers || 0)
            }));
          }

          crops = crops.map(c => {
            const name = c.name || c.item || 'Crop';
            const key  = name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const qty  = parseFloat(c.qty || 0);
            let fl     = parseFloat(c.flowers || 0);
            if (fl > qty * 1.5 || fl <= 0) {
              fl = Math.ceil((CROP_FLOWER_PRICES[key] || 0.01) * qty * 0.9 * 1000) / 1000;
            }
            return { name, qty, flowers: fl };
          });

          const netFlowers = crops.length
            ? crops.reduce((s, c) => s + (parseFloat(c.flowers) || 0), 0)
            : parseFloat(r.net_flowers || 0);

          return {
            date:               r.yield_date ? new Date(r.yield_date).toISOString().split('T')[0] : '',
            totalCount:         parseFloat(r.total_count || 0),
            netFlowers:         netFlowers.toFixed(3),
            crops,
            cropActivityYields: acts
          };
        });

        const valid = formatted.filter(r => r.totalCount > 0 || r.crops.length > 0);
        const seenDates = new Set();
        const uniqueYields = [];
        for (const y of valid) {
          if (y.date && !seenDates.has(y.date)) {
            seenDates.add(y.date);
            uniqueYields.push(y);
          }
        }
        uniqueYields.sort((a, b) => b.date.localeCompare(a.date));
        return res.status(200).json({ success: true, source: 'supabase', data: uniqueYields });
      }
    }

    return res.status(200).json({ success: true, source: 'supabase', data: [] });
  } catch (supaErr) {
    console.warn("Supabase /api/yields notice:", supaErr.message);
    return res.status(500).json({ success: false, error: supaErr.message, data: [] });
  }
});

// ── /api/weekly-yields — Serve weekly summary archive from Supabase ──────────
app.get('/api/weekly-yields', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { farmId, userId } = req.query;

  try {
    const requestedUserId = userId ? String(userId).trim() : '';
    const cleanFarmId = farmId ? String(farmId).trim() : '';
    const targetUserIds = [];
    if (requestedUserId) targetUserIds.push(requestedUserId);

    if (cleanFarmId) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('farm_id', cleanFarmId);
      if (Array.isArray(profiles)) {
        profiles.forEach(p => {
          if (p.id && !targetUserIds.includes(p.id)) targetUserIds.push(p.id);
        });
      }
    }

    if (targetUserIds.length > 0) {
      const { data: weeklyRows, error: wErr } = await supabase
        .from('weekly_yields')
        .select('*')
        .in('user_id', targetUserIds)
        .order('week_start', { ascending: false });

      if (!wErr && Array.isArray(weeklyRows) && weeklyRows.length > 0) {
        weeklyRows.sort((a, b) => {
          if (requestedUserId) {
            if (a.user_id === requestedUserId && b.user_id !== requestedUserId) return -1;
            if (b.user_id === requestedUserId && a.user_id !== requestedUserId) return 1;
          }
          return (b.total_items || 0) - (a.total_items || 0);
        });
        const seenWeeks = new Set();
        const uniqueWeekly = [];
        for (const w of weeklyRows) {
          const key = w.week_start || w.week_key;
          if (key && !seenWeeks.has(key)) {
            seenWeeks.add(key);
            uniqueWeekly.push(w);
          }
        }
        uniqueWeekly.sort((a, b) => (b.week_start || '').localeCompare(a.week_start || ''));
        return res.status(200).json({ success: true, source: 'supabase_weekly', data: uniqueWeekly });
      }
    }

    return res.status(200).json({ success: true, source: 'supabase_weekly', data: [] });
  } catch (err) {
    console.warn("Supabase /api/weekly-yields notice:", err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

// ── /api/monthly-yields — Serve monthly summary archive from Supabase ────────
app.get('/api/monthly-yields', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { farmId, userId, monthKey } = req.query;

  try {
    const requestedUserId = userId ? String(userId).trim() : '';
    const cleanFarmId = farmId ? String(farmId).trim() : '';
    const targetUserIds = [];
    if (requestedUserId) targetUserIds.push(requestedUserId);

    if (cleanFarmId) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('farm_id', cleanFarmId);
      if (Array.isArray(profiles)) {
        profiles.forEach(p => {
          if (p.id && !targetUserIds.includes(p.id)) targetUserIds.push(p.id);
        });
      }
    }

    if (targetUserIds.length > 0) {
      let query = supabase
        .from('monthly_yields')
        .select('*')
        .in('user_id', targetUserIds);

      if (monthKey) {
        query = query.eq('month_key', String(monthKey).trim());
      }

      const { data: monthlyRows, error: mErr } = await query.order('month_start', { ascending: false });

      if (!mErr && Array.isArray(monthlyRows) && monthlyRows.length > 0) {
        monthlyRows.sort((a, b) => {
          if (requestedUserId) {
            if (a.user_id === requestedUserId && b.user_id !== requestedUserId) return -1;
            if (b.user_id === requestedUserId && a.user_id !== requestedUserId) return 1;
          }
          return (b.total_items || 0) - (a.total_items || 0);
        });
        const seenMonths = new Set();
        const uniqueMonthly = [];
        for (const m of monthlyRows) {
          const key = m.month_key || m.month_start;
          if (key && !seenMonths.has(key)) {
            seenMonths.add(key);
            uniqueMonthly.push(m);
          }
        }
        uniqueMonthly.sort((a, b) => (b.month_start || '').localeCompare(a.month_start || ''));
        return res.status(200).json({ success: true, source: 'supabase_monthly', data: uniqueMonthly });
      }
    }

    return res.status(200).json({ success: true, source: 'supabase_monthly', data: [] });
  } catch (err) {
    console.warn("Supabase /api/monthly-yields notice:", err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

app.post('/api/weekly-yields/recalc', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { userId, date } = req.body || req.query;
  if (!userId || !date) {
    return res.status(400).json({ success: false, error: 'Missing userId or date' });
  }
  try {
    const updated = await recalculateWeekForUser(supabase, userId, date);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('Recalculate error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Fallback: serve index.html for any unknown route (SPA) ────────────────
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── Internal cron schedule (UTC timezone) ──────────────────────────────────
// 1. Daily snapshot at 00:01 UTC (start of day post-midnight SFL reset)
cron.schedule('1 0 * * *', () => {
  if (isAnySyncRunning()) {
    console.warn('⚠️ [Cron] 00:01 UTC Baseline Snapshot skipped: another sync is already running.');
    return;
  }
  isSnapshotRunning = true;
  console.log('⏰ [Cron] 00:01 UTC — Baseline Snapshot...');
  processBaselineSnapshot(supabase)
    .catch(err => console.error('Snapshot error:', err.message))
    .finally(() => { isSnapshotRunning = false; });
}, { scheduled: true, timezone: "UTC" });

// 2. Daily yield calculation at 22:30 UTC (tallies day harvests against 00:01 baseline)
cron.schedule('30 22 * * *', () => {
  if (isAnySyncRunning()) {
    console.warn('⚠️ [Cron] 22:30 UTC Daily yield calculation skipped: another sync is already running.');
    return;
  }
  isYieldRunning = true;
  console.log('⏰ [Cron] 22:30 UTC — Daily yield calculation...');
  processYieldCalculation(supabase)
    .catch(err => console.error('Yield error:', err.message))
    .finally(() => { isYieldRunning = false; });
}, { scheduled: true, timezone: "UTC" });

// 3. Marketplace trades auto-sync 5x daily (02:00, 06:00, 10:00, 14:00, 20:00 UTC)
cron.schedule('0 2,6,10,14,20 * * *', () => {
  if (isAnySyncRunning()) {
    console.warn('⚠️ [Cron] Trade auto-sync skipped: another sync is already running.');
    return;
  }
  isTradesSyncRunning = true;
  console.log('⏰ [Cron] Trade auto-sync (5x daily)...');
  processAutoSyncTrades(supabase)
    .catch(err => console.error('Trade sync error:', err.message))
    .finally(() => { isTradesSyncRunning = false; });
}, { scheduled: true, timezone: "UTC" });

app.listen(PORT, () => {
  console.log(`🚀 SFL Resource Calculator Backend listening on port ${PORT}`);
  // Run repair once on startup in case any past baseline was missed
  repairMissingBaselines(supabase)
    .then(res => console.log('Startup baseline repair status:', res))
    .catch(err => console.warn('Startup baseline repair notice:', err.message));
});
