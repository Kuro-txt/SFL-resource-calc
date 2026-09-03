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
const cron    = require('node-cron');
const { createClient } = require('@supabase/supabase-js');

// ── Backend service modules ────────────────────────────────────────────────
const { getTiDBPool, ensureYieldsTableCreated } = require('./backend/db');
const { CROP_FLOWER_PRICES }                     = require('./backend/prices');
const { fetchFarmFullDataWithRetry, getSflHeaders, formatNftItem } = require('./backend/farmApi');
const { processBaselineSnapshot }                = require('./backend/baselineService');
const { processYieldCalculation, backfillDailyYields } = require('./backend/yieldService');
const { processAutoSyncTrades }                  = require('./backend/tradeSync');

// ── App & Supabase setup ───────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gtvglgeoznnrsdcfazpc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dmdsZ2Vvem5ucnNkY2ZhenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTA4NzIsImV4cCI6MjEwMDI4Njg3Mn0.oKTNu5vXA2hJ4p9D-unvkeiF7tEyu1_PFVgnEigmKoo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY || 'anubhav@877';

const SFL_WORLD_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://sfl.world/',
  'Origin': 'https://sfl.world',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin'
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
  const key = req.query.key || (req.headers.authorization
    ? req.headers.authorization.replace(/^Bearer\s+/i, '')
    : '');
  return key === CRON_SECRET_KEY;
}

// ── Simple API proxy routes ────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.status(200).send('OK'));

app.get('/api/get-data', async (_req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/prices', {
      headers: SFL_WORLD_HEADERS, timeout: 10000
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price data', details: err.message });
  }
});

app.get('/api/get-farm', async (req, res) => {
  const { farmId, apiKey } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });
  try {
    const { inventory, farmActivity, npcs } = await fetchFarmFullDataWithRetry(
      String(farmId).trim(), 5, apiKey ? String(apiKey).trim() : ''
    );
    res.json({ success: true, farm: { inventory, farmActivity, npcs } });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

app.get('/api/get-land', async (req, res) => {
  const { farmId } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });
  try {
    const response = await axios.get(
      `https://sfl.world/api/v1/land/${encodeURIComponent(String(farmId).trim())}`,
      { headers: SFL_WORLD_HEADERS, timeout: 10000 }
    );
    res.json({ success: true, land: response.data });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch land data', details: err.message });
  }
});

app.get('/api/get-marketplace', async (req, res) => {
  const { farmId, apiKey } = req.query;
  if (!farmId) return res.status(400).json({ error: 'Farm ID is required' });
  try {
    const response = await axios.get(
      `https://api.sunflower-land.com/community/data?type=marketplaceProfile&farmId=${encodeURIComponent(String(farmId).trim())}`,
      { headers: getSflHeaders(apiKey ? String(apiKey).trim() : ''), timeout: 15000 }
    );
    res.json({ success: true, data: response.data });
  } catch (err) {
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

app.get('/api/nfts', async (_req, res) => {
  try {
    const response = await axios.get('https://sfl.world/api/v1/nfts', {
      headers: SFL_WORLD_HEADERS, timeout: 12000
    });
    let rawData = response.data;
    if (typeof rawData === 'string') {
      if (rawData.includes('<!DOCTYPE html>') || rawData.includes('Cloudflare')) {
        throw new Error('Cloudflare challenge page returned');
      }
      rawData = JSON.parse(rawData);
    }
    const itemsList = [];
    function parseNode(node, key = '') {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(c => parseNode(c, key)); return; }
      const formatted = formatNftItem(node, key);
      if (formatted) itemsList.push(formatted);
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'object' && v !== null) parseNode(v, k);
      }
    }
    parseNode(rawData);
    const uniqueMap = new Map();
    itemsList.forEach(item => {
      if (item.name && !uniqueMap.has(item.name.toLowerCase())) {
        uniqueMap.set(item.name.toLowerCase(), item);
      }
    });
    const finalNFTs = Array.from(uniqueMap.values());
    if (finalNFTs.length > 0) return res.json(finalNFTs);
    throw new Error('Parsed items array is empty');
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch live NFTs: ${err.message}` });
  }
});

// ── Cron trigger routes ────────────────────────────────────────────────────
app.get('/api/trigger-daily-baseline', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { type } = req.query;
  if (type === 'baseline') {
    res.status(200).json({ success: true, message: 'Baseline started.' });
    processBaselineSnapshot(supabase).catch(err => console.error('Baseline Error:', err.message));
  } else if (type === 'yield') {
    res.status(200).json({ success: true, message: 'Yield started.' });
    processYieldCalculation(supabase).catch(err => console.error('Yield Error:', err.message));
  } else if (type === 'trades') {
    res.status(200).json({ success: true, message: 'Trades auto-sync started.' });
    processAutoSyncTrades(supabase).catch(err => console.error('Trades Error:', err.message));
  } else {
    res.status(400).json({ error: "Invalid type. Use 'type=baseline', 'type=yield', or 'type=trades'." });
  }
});

app.get('/api/cron/snapshot', (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.status(200).json({ success: true });
  processBaselineSnapshot(supabase).catch(err => console.error('Snapshot Error:', err.message));
});

app.get('/api/cron/22utc-yield', (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.status(200).json({ success: true });
  processYieldCalculation(supabase).catch(err => console.error('Yield Error:', err.message));
});

app.get('/api/cron/sync-trades', (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  res.status(200).json({ success: true, message: 'Marketplace trades auto-sync initiated.' });
  processAutoSyncTrades(supabase).catch(err => console.error('Auto-sync trades Error:', err.message));
});

app.get('/api/cron/backfill-yields', async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  const result = await backfillDailyYields(supabase);
  res.status(200).json(result);
});

// ── /api/yields — Serve daily yield history from Supabase (with TiDB fallback) ───────────────
app.get('/api/yields', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { farmId, userId } = req.query;

  // 1. Try Supabase daily_yields first
  try {
    let targetUserId = userId ? String(userId).trim() : '';
    if (!targetUserId && farmId) {
      const cleanFarmId = String(farmId).trim();
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('farm_id', cleanFarmId)
        .maybeSingle();
      if (profile?.id) targetUserId = profile.id;
    }

    if (targetUserId) {
      const { data: supaRows, error: sErr } = await supabase
        .from('daily_yields')
        .select('*')
        .eq('user_id', targetUserId)
        .gt('total_count', 0)
        .order('yield_date', { ascending: false })
        .limit(100);

      if (!sErr && Array.isArray(supaRows) && supaRows.length > 0) {
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
        if (valid.length > 0) {
          return res.status(200).json({ success: true, source: 'supabase', data: valid });
        }
      }
    }
  } catch (supaErr) {
    console.warn("Supabase /api/yields notice:", supaErr.message);
  }

  // 2. Fallback to TiDB Cloud if Supabase is unavailable or returned empty
  const pool = getTiDBPool();
  if (!pool) return res.status(200).json({ success: false, data: [], message: 'No yield records found' });

  try {
    await ensureYieldsTableCreated(pool);
    let query  = 'SELECT * FROM user_daily_yields WHERE 1=1';
    const params = [];

    if (farmId && userId) {
      query += ' AND (farm_id = ? OR user_id = ?)'; params.push(farmId, userId);
    } else if (farmId) {
      query += ' AND farm_id = ?'; params.push(farmId);
    } else if (userId) {
      query += ' AND user_id = ?'; params.push(userId);
    }
    query += ' AND total_count > 0 ORDER BY yield_date DESC LIMIT 100';

    const [rows] = await pool.query(query, params);

    const formatted = (rows || []).map(r => {
      let crops = typeof r.crops === 'string' ? JSON.parse(r.crops || '[]') : (r.crops || []);
      const acts = typeof r.crop_activity_yields === 'string'
        ? JSON.parse(r.crop_activity_yields || '[]') : (r.crop_activity_yields || []);

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
    res.status(200).json({ success: true, data: valid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Fallback: serve index.html for any unknown route (SPA) ────────────────
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── Internal cron schedule ─────────────────────────────────────────────────
cron.schedule('50 21 * * *', () => {
  console.log('⏰ [Cron] 21:50 UTC — Snapshot...');
  processBaselineSnapshot(supabase).catch(err => console.error('Snapshot error:', err.message));
});

cron.schedule('0 22 * * *', () => {
  console.log('⏰ [Cron] 22:00 UTC — Daily yield calculation...');
  processYieldCalculation(supabase).catch(err => console.error('Yield error:', err.message));
});

cron.schedule('33 0,6,12,18 * * *', () => {
  console.log('⏰ [Cron] Trade auto-sync (4x daily)...');
  processAutoSyncTrades(supabase).catch(err => console.error('Trade sync error:', err.message));
});

app.listen(PORT, () => {
  console.log(`🚀 SFL Resource Calculator Backend listening on port ${PORT}`);
});
