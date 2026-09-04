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
  try {
    if (pool) {
      await pool.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      await pool.query(`USE ${dbName}`);
      await pool.query(schemaSql);
      await pool.query(`ALTER TABLE user_trades ADD COLUMN IF NOT EXISTS tax DECIMAL(20, 6) DEFAULT 0;`).catch(() => {});
      await pool.query(`ALTER TABLE user_trades ADD COLUMN IF NOT EXISTS net_sfl DECIMAL(20, 6) DEFAULT 0;`).catch(() => {});

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
      const { farmId, trades } = req.body || {};
      if (!farmId || !Array.isArray(trades) || trades.length === 0) {
        return res.status(400).json({ error: 'Valid farmId and trades array required' });
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
        const tax = parseFloat(t.tax || 0);
        const tradeType = String(t.tradeType || 'sold').toLowerCase();
        const netSfl = tradeType === 'sold' ? Math.max(0, sfl - tax) : sfl;
        const unitPrice = quantity > 0 ? (sfl / quantity) : sfl;
        const source = String(t.source || 'listing').toLowerCase();
        const counterpartyId = t.counterpartyId ? String(t.counterpartyId).trim() : null;
        const counterpartyName = t.counterpartyName ? String(t.counterpartyName).substring(0, 128) : null;
        const fulfilledAt = parseInt(t.fulfilledAt || Date.now(), 10);
        const fulfilledDate = new Date(fulfilledAt).toISOString().slice(0, 19).replace('T', ' ');

        const insertSql = `
          INSERT INTO user_trades 
          (id, farm_id, item_id, item_name, quantity, sfl, tax, net_sfl, unit_price, trade_type, source, counterparty_id, counterparty_name, fulfilled_at, fulfilled_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            item_name = VALUES(item_name),
            quantity = VALUES(quantity),
            sfl = VALUES(sfl),
            tax = VALUES(tax),
            net_sfl = VALUES(net_sfl),
            unit_price = VALUES(unit_price)
        `;

        try {
          const [result] = await pool.query(insertSql, [
            id, farmId, itemId, itemName, quantity, sfl, tax, netSfl, unitPrice, tradeType, source, counterpartyId, counterpartyName, fulfilledAt, fulfilledDate
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

      const formattedTrades = (rows || []).map(r => {
        const sfl = parseFloat(r.sfl || 0);
        const qty = parseFloat(r.quantity || 1);
        const isSeller = r.trade_type === 'sold';

        if (isSeller) {
          totalSoldVolume += sfl;
          totalSoldCount += qty;
        } else {
          totalBoughtVolume += sfl;
          totalBoughtCount += qty;
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
          netFlow
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
