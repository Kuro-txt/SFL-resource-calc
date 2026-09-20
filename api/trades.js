import mysql from 'mysql2/promise';
import { getItemNameById } from '../src/data/knownIds.js';

let pool = null;
let isTableReady = false;

function getTiDBConfig() {
  const rawUrl = 
    process.env.TIDB_DATABASE_URL || 
    process.env.DATABASE_URL || 
    process.env.TIDB_URL || 
    process.env.MYSQL_URL || 
    '';

  if (!rawUrl) return null;
  const cleanUrl = rawUrl.trim().replace(/^['"]|['"]$/g, '');

  const match = cleanUrl.match(/^mysql(?:2)?:\/\/(.*?):(.*?)@([^:/]+)(?::(\d+))?(?:\/([^?]*))?(?:\?(.*))?$/);
  if (match) {
    const [, user, password, host, portStr, dbName] = match;
    let database = dbName || 'test';
    if (!database || ['sys', 'information_schema', 'performance_schema'].includes(database)) {
      database = 'test';
    }
    return {
      host,
      port: parseInt(portStr || '4000', 10),
      user: decodeURIComponent(user),
      password: decodeURIComponent(password),
      database,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
    };
  }

  try {
    const parsed = new URL(cleanUrl);
    let dbName = parsed.pathname.replace(/^\//, '').split('?')[0] || 'test';
    if (!dbName || ['sys', 'information_schema', 'performance_schema'].includes(dbName)) {
      dbName = 'test';
    }
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '4000', 10),
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      database: dbName,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
    };
  } catch {
    return { uri: cleanUrl, database: 'test', ssl: { rejectUnauthorized: false } };
  }
}

function getTiDBPool() {
  const config = getTiDBConfig();
  if (!config) return null;

  if (!pool) {
    const db = config.database || 'test';
    if (config.host && config.user) {
      pool = mysql.createPool({
        host: config.host,
        port: config.port || 4000,
        user: config.user,
        password: config.password,
        database: db,
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false
        },
        waitForConnections: true,
        connectionLimit: 4,
        maxIdle: 2,
        idleTimeout: 30000,
        queueLimit: 0
      });
    } else {
      pool = mysql.createPool({
        uri: config.cleanUrl,
        database: db,
        ssl: { rejectUnauthorized: false }
      });
    }
  }
  return pool;
}

async function getLiveExchangeRate() {
  try {
    const res = await fetch('https://sfl.world/api/v1.1/exchange', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return null;
}

let lastExchangeRateRecordTime = 0;
async function recordExchangeRateSnapshot(pool, data) {
  if (!pool || !data || !data.sfl) return;
  const now = Date.now();
  if (now - lastExchangeRateRecordTime < 15 * 60 * 1000) return;

  try {
    const sflUsd = parseFloat(data.sfl?.usd) || 0;
    if (sflUsd <= 0) return;
    const polUsd = parseFloat(data.pol?.usd) || null;
    const sflEur = parseFloat(data.sfl?.eur) || null;
    const rawJson = JSON.stringify(data);

    await pool.query(
      `INSERT INTO sfl_exchange_rates (sfl_usd, pol_usd, sfl_eur, raw_data) VALUES (?, ?, ?, ?)`,
      [sflUsd, polUsd, sflEur, rawJson]
    );
    lastExchangeRateRecordTime = now;
    console.log(`💵 [TiDB Exchange] Saved SFL rate: $${sflUsd} USD to sfl_exchange_rates.`);
  } catch (err) {
    console.warn("TiDB Exchange rate save notice:", err.message);
  }
}

async function ensureTableCreated(pool, dbName = 'test') {
  if (isTableReady) return;
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS user_trades (
      id VARCHAR(64) PRIMARY KEY,
      farm_id BIGINT NOT NULL,
      item_id INT NOT NULL,
      item_name VARCHAR(128) NOT NULL,
      quantity DECIMAL(20, 4) NOT NULL,
      sfl DECIMAL(20, 4) NOT NULL,
      tax DECIMAL(20, 6) DEFAULT 0,
      net_sfl DECIMAL(20, 6) DEFAULT 0,
      sfl_usd DECIMAL(12, 6) DEFAULT NULL,
      usd_value DECIMAL(20, 6) DEFAULT NULL,
      unit_price DECIMAL(20, 6) NOT NULL,
      trade_type VARCHAR(16) NOT NULL,
      source VARCHAR(16) NOT NULL,
      counterparty_id BIGINT,
      counterparty_name VARCHAR(128),
      fulfilled_at BIGINT NOT NULL,
      fulfilled_date DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_farm_fulfilled (farm_id, fulfilled_at DESC),
      INDEX idx_item_date (item_name, fulfilled_at DESC)
    );
  `;
  const exchangeRatesSql = `
    CREATE TABLE IF NOT EXISTS sfl_exchange_rates (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      sfl_usd DECIMAL(12, 6) NOT NULL,
      pol_usd DECIMAL(12, 6),
      sfl_eur DECIMAL(12, 6),
      raw_data JSON,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_recorded_at (recorded_at DESC)
    );
  `;
  try {
    if (pool) {
      await pool.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      await pool.query(`USE ${dbName}`);
      await pool.query(schemaSql);
      await pool.query(exchangeRatesSql);
      await pool.query(`ALTER TABLE user_trades ADD COLUMN IF NOT EXISTS tax DECIMAL(20, 6) DEFAULT 0;`).catch(() => {});
      await pool.query(`ALTER TABLE user_trades ADD COLUMN IF NOT EXISTS net_sfl DECIMAL(20, 6) DEFAULT 0;`).catch(() => {});
      await pool.query(`ALTER TABLE user_trades ADD COLUMN IF NOT EXISTS sfl_usd DECIMAL(12, 6) DEFAULT NULL;`).catch(() => {});
      await pool.query(`ALTER TABLE user_trades ADD COLUMN IF NOT EXISTS usd_value DECIMAL(20, 6) DEFAULT NULL;`).catch(() => {});

      // Auto-backfill missing tax and net_sfl for historical trades
      await pool.query(`UPDATE user_trades SET tax = ROUND(sfl * 0.10, 4), net_sfl = ROUND(sfl * 0.90, 4) WHERE trade_type = 'sold' AND (tax = 0 OR tax IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET tax = 0, net_sfl = sfl WHERE trade_type = 'bought' AND (net_sfl = 0 OR net_sfl IS NULL);`).catch(() => {});

      // Auto-backfill missing sfl_usd and usd_value for historical trades
      try {
        const [nullCheck] = await pool.query(`SELECT COUNT(*) as count FROM user_trades WHERE sfl_usd IS NULL OR sfl_usd = 0;`);
        if (nullCheck && nullCheck[0]?.count > 0) {
          let latestRate = null;
          try {
            const [rateRows] = await pool.query(`SELECT sfl_usd FROM sfl_exchange_rates ORDER BY recorded_at DESC LIMIT 1;`);
            if (rateRows && rateRows.length > 0 && rateRows[0].sfl_usd > 0) {
              latestRate = parseFloat(rateRows[0].sfl_usd);
            }
          } catch (e) {}
          if (!latestRate) {
            const liveEx = await getLiveExchangeRate();
            if (liveEx?.sfl?.usd) {
              latestRate = parseFloat(liveEx.sfl.usd);
              await recordExchangeRateSnapshot(pool, liveEx);
            }
          }
          if (!latestRate || isNaN(latestRate)) latestRate = 0.156060;

          await pool.query(
            `UPDATE user_trades 
             SET sfl_usd = ?, 
                 usd_value = ROUND(CASE WHEN trade_type = 'sold' THEN net_sfl * ? ELSE sfl * ? END, 4) 
             WHERE sfl_usd IS NULL OR sfl_usd = 0;`,
            [latestRate, latestRate, latestRate]
          );
          console.log(`💵 [TiDB Auto-Backfill] Backfilled ${nullCheck[0].count} historical trades with SFL rate: $${latestRate} USD.`);
        }
      } catch (backfillErr) {
        console.warn("Historical sfl_usd backfill notice:", backfillErr.message);
      }

      // Auto-correct known historical offer trades that had inverted trade_type in TiDB
      await pool.query(`UPDATE user_trades SET trade_type = 'sold', tax = ROUND(sfl * 0.10, 4), net_sfl = ROUND(sfl * 0.90, 4) WHERE id = '823e4d29';`).catch(() => {});
      await pool.query(`UPDATE user_trades SET trade_type = 'bought', tax = 0, net_sfl = sfl WHERE id IN ('914b14f7', 'fc703fa3');`).catch(() => {});
      await pool.query(`UPDATE user_trades SET counterparty_name = 'Market Trader' WHERE counterparty_name = 'Kuro1' OR counterparty_id = farm_id;`).catch(() => {});

      // Auto-clean legacy Item # placeholders to official names
      await pool.query(`UPDATE user_trades SET item_name = 'Crimson Baitfish' WHERE item_id = 2988 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Moonfur' WHERE item_id = 2634 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Ruffroot' WHERE item_id = 2631 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Chewed Bone' WHERE item_id = 2632 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Heart leaf' WHERE item_id = 2633 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Ribbon' WHERE item_id = 2636 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Dewberry' WHERE item_id = 2637 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Wild Grass' WHERE item_id = 2638 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Frost Pebble' WHERE item_id = 2639 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Capsule Bait' WHERE item_id = 2986 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
      await pool.query(`UPDATE user_trades SET item_name = 'Umbrella Bait' WHERE item_id = 2987 AND (item_name LIKE 'Item #%' OR item_name = '' OR item_name IS NULL);`).catch(() => {});
    }
    isTableReady = true;
  } catch (err) {
    console.warn("Table auto-migration notice:", err.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const config = getTiDBConfig();
  if (!config) {
    return res.status(200).json({ 
      success: false, 
      configured: false,
      message: 'TiDB Cloud not configured. Add TIDB_DATABASE_URL to Vercel Environment Variables.' 
    });
  }

  const pool = getTiDBPool();
  const dbName = config.database || 'test';

  try {
    await ensureTableCreated(pool, dbName);

    if (req.method === 'POST') {
      const { farmId, trades, exchange } = req.body || {};
      if (!farmId || !Array.isArray(trades) || trades.length === 0) {
        return res.status(400).json({ error: 'Valid farmId and trades array required' });
      }

      if (exchange) {
        await recordExchangeRateSnapshot(pool, exchange);
      }

      let insertedCount = 0;
      const errors = [];

      for (const t of trades) {
        const id = String(t.id || '').trim();
        if (!id) continue;

        const itemId = parseInt(t.itemId || 0, 10);
        const resolvedName = (t.itemName && !t.itemName.startsWith('Item #'))
          ? t.itemName
          : (t.name && !t.name.startsWith('Item #') ? t.name : getItemNameById(itemId || t.itemId));
        const itemName = String(resolvedName || `Item #${itemId}`).substring(0, 128);
        const quantity = parseFloat(t.quantity || 1);
        const sfl = parseFloat(t.sfl || 0);
        const tradeType = String(t.tradeType || t.trade_type || 'bought').toLowerCase();
        let tax = parseFloat(t.tax || 0);
        if (tradeType === 'sold' && (!tax || tax <= 0)) {
          tax = Math.round((sfl * 0.10) * 10000) / 10000;
        }
        const netSfl = (t.netSfl !== undefined && t.netSfl !== null) ? parseFloat(t.netSfl) : (tradeType === 'sold' ? Math.max(0, sfl - tax) : sfl);
        const unitPrice = quantity > 0 ? (sfl / quantity) : sfl;
        const source = String(t.source || 'listing').toLowerCase();
        const counterpartyId = t.counterpartyId ? String(t.counterpartyId).trim() : null;
        const counterpartyName = t.counterpartyName ? String(t.counterpartyName).substring(0, 128) : null;
        const fulfilledAt = parseInt(t.fulfilledAt || Date.now(), 10);
        const fulfilledDate = new Date(fulfilledAt).toISOString().slice(0, 19).replace('T', ' ');

        let sflUsd = (t.sflUsd !== undefined && t.sflUsd !== null && !isNaN(parseFloat(t.sflUsd)))
          ? parseFloat(t.sflUsd)
          : (t.sfl_usd !== undefined && t.sfl_usd !== null && !isNaN(parseFloat(t.sfl_usd)) ? parseFloat(t.sfl_usd) : null);

        if (sflUsd === null && exchange?.sfl?.usd) {
          sflUsd = parseFloat(exchange.sfl.usd);
        }

        let usdValue = (t.usdValue !== undefined && t.usdValue !== null && !isNaN(parseFloat(t.usdValue)))
          ? parseFloat(t.usdValue)
          : (t.usd_value !== undefined && t.usd_value !== null && !isNaN(parseFloat(t.usd_value)) ? parseFloat(t.usd_value) : null);

        if (usdValue === null && sflUsd !== null) {
          const tradeSfl = tradeType === 'sold' ? netSfl : sfl;
          usdValue = Math.round((tradeSfl * sflUsd) * 10000) / 10000;
        }

        const insertSql = `
          INSERT INTO user_trades 
          (id, farm_id, item_id, item_name, quantity, sfl, tax, net_sfl, sfl_usd, usd_value, unit_price, trade_type, source, counterparty_id, counterparty_name, fulfilled_at, fulfilled_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            item_name = VALUES(item_name),
            quantity = VALUES(quantity),
            sfl = VALUES(sfl),
            tax = VALUES(tax),
            net_sfl = VALUES(net_sfl),
            sfl_usd = COALESCE(user_trades.sfl_usd, VALUES(sfl_usd)),
            usd_value = COALESCE(user_trades.usd_value, VALUES(usd_value)),
            unit_price = VALUES(unit_price),
            trade_type = VALUES(trade_type),
            source = VALUES(source),
            counterparty_id = VALUES(counterparty_id),
            counterparty_name = VALUES(counterparty_name)
        `;

        try {
          const [result] = await pool.query(insertSql, [
            id, farmId, itemId, itemName, quantity, sfl, tax, netSfl, sflUsd, usdValue, unitPrice, tradeType, source, counterpartyId, counterpartyName, fulfilledAt, fulfilledDate
          ]);
          if (result && (result.affectedRows > 0 || result.insertId !== undefined)) {
            insertedCount++;
          }
        } catch (queryErr) {
          errors.push({ tradeId: id, error: queryErr.message });
        }
      }

      let totalInCloud = 0;
      try {
        const [countRes] = await pool.query('SELECT COUNT(*) as total FROM user_trades WHERE farm_id = ?', [farmId]);
        totalInCloud = countRes[0]?.total || 0;
      } catch (countErr) {
        errors.push({ countError: countErr.message });
        totalInCloud = insertedCount;
      }

      return res.status(200).json({
        success: true,
        configured: true,
        savedNewTrades: insertedCount,
        totalArchivedTrades: totalInCloud,
        debugErrors: errors.length > 0 ? errors : undefined,
        db: dbName
      });
    }

    if (req.method === 'GET') {
      const { farmId } = req.query;
      if (!farmId) {
        return res.status(400).json({ error: 'Farm ID is required' });
      }

      let rows = [];
      try {
        const [dbRows] = await pool.query(
          'SELECT * FROM user_trades WHERE farm_id = ? ORDER BY fulfilled_at DESC LIMIT 5000',
          [farmId]
        );
        rows = dbRows || [];
      } catch (selectErr) {
        console.warn("Trade select query notice:", selectErr.message);
      }

      let totalSoldVolume = 0;
      let totalSoldCount = 0;
      let totalBoughtVolume = 0;
      let totalBoughtCount = 0;
      let totalSoldUsd = 0;
      let totalBoughtUsd = 0;

      const formattedTrades = (rows || []).map(r => {
        const sfl = parseFloat(r.sfl || 0);
        const qty = parseFloat(r.quantity || 1);
        const isSeller = r.trade_type === 'sold';
        let tax = parseFloat(r.tax || 0);
        if (isSeller && (!tax || tax <= 0)) {
          tax = Math.round((sfl * 0.10) * 10000) / 10000;
        } else if (!isSeller) {
          tax = 0;
        }
        const netSfl = parseFloat(r.net_sfl || (isSeller ? Math.max(0, sfl - tax) : sfl));

        const tradeSflUsd = r.sfl_usd !== null && r.sfl_usd !== undefined ? parseFloat(r.sfl_usd) : null;
        let tradeUsdValue = r.usd_value !== null && r.usd_value !== undefined ? parseFloat(r.usd_value) : null;
        if (tradeUsdValue === null && tradeSflUsd !== null) {
          tradeUsdValue = Math.round(((isSeller ? netSfl : sfl) * tradeSflUsd) * 10000) / 10000;
        }

        if (isSeller) {
          totalSoldVolume += netSfl;
          totalSoldCount += qty;
          if (tradeUsdValue) totalSoldUsd += tradeUsdValue;
        } else {
          totalBoughtVolume += sfl;
          totalBoughtCount += qty;
          if (tradeUsdValue) totalBoughtUsd += tradeUsdValue;
        }

        const rawDbName = r.item_name;
        const resolvedName = (!rawDbName || rawDbName.startsWith('Item #'))
          ? (getItemNameById(r.item_id || rawDbName) || rawDbName)
          : rawDbName;

        return {
          id: r.id,
          farmId: r.farm_id,
          itemId: r.item_id,
          itemName: resolvedName,
          quantity: qty,
          sfl: sfl,
          tax: tax,
          netSfl: netSfl,
          sflUsd: tradeSflUsd,
          usdValue: tradeUsdValue,
          unitPrice: parseFloat(r.unit_price || 0),
          tradeType: r.trade_type,
          source: r.source,
          counterpartyId: r.counterparty_id,
          counterpartyName: r.counterparty_name,
          fulfilledAt: Number(r.fulfilled_at),
          fulfilledDate: r.fulfilled_date,
          createdAt: r.created_at
        };
      });

      const netFlow = totalSoldVolume - totalBoughtVolume;
      const netFlowUsd = totalSoldUsd - totalBoughtUsd;

      res.setHeader('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
      return res.status(200).json({
        success: true,
        configured: true,
        count: formattedTrades.length,
        trades: formattedTrades,
        stats: {
          totalSoldVolume,
          totalSoldCount,
          totalBoughtVolume,
          totalBoughtCount,
          netFlow,
          totalSoldUsd: Math.round(totalSoldUsd * 100) / 100,
          totalBoughtUsd: Math.round(totalBoughtUsd * 100) / 100,
          netFlowUsd: Math.round(netFlowUsd * 100) / 100
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("TiDB Cloud handler error:", error);
    return res.status(500).json({
      success: false,
      error: 'TiDB Cloud operation failed',
      details: error.message
    });
  }
}
