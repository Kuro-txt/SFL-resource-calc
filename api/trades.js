import mysql from 'mysql2/promise';
import https from 'https';

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

  try {
    const parsed = new URL(cleanUrl);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '4000', 10),
      user: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname.replace(/^\//, '') || 'test',
      cleanUrl
    };
  } catch {
    return { cleanUrl, database: 'test' };
  }
}

function getTiDBPool() {
  const config = getTiDBConfig();
  if (!config) return null;

  if (!pool) {
    if (config.host && config.user) {
      pool = mysql.createPool({
        host: config.host,
        port: config.port || 4000,
        user: config.user,
        password: config.password,
        database: config.database || 'test',
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false
        },
        waitForConnections: true,
        connectionLimit: 3,
        maxIdle: 2,
        idleTimeout: 30000,
        queueLimit: 0
      });
    } else {
      pool = mysql.createPool({
        uri: config.cleanUrl,
        ssl: { rejectUnauthorized: false }
      });
    }
  }
  return pool;
}

// Fallback: TiDB Cloud Serverless HTTP REST API
async function executeHttpSql(sql, database = 'test') {
  const config = getTiDBConfig();
  if (!config || !config.host || !config.user) return null;

  const auth = Buffer.from(`${config.user}:${config.password}`).toString('base64');
  const endpoint = `https://${config.host}/v1beta1/sql`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ database, sql })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP SQL failed (${res.status}): ${errText}`);
  }

  return await res.json();
}

async function ensureTableCreated(pool) {
  if (isTableReady) return;
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS user_trades (
      id VARCHAR(64) PRIMARY KEY,
      farm_id BIGINT NOT NULL,
      item_id INT NOT NULL,
      item_name VARCHAR(128) NOT NULL,
      quantity DECIMAL(20, 4) NOT NULL,
      sfl DECIMAL(20, 4) NOT NULL,
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
      await pool.query(schemaSql);
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

  try {
    await ensureTableCreated(pool);

    if (req.method === 'POST') {
      const { farmId, trades } = req.body || {};
      if (!farmId || !Array.isArray(trades) || trades.length === 0) {
        return res.status(400).json({ error: 'Valid farmId and trades array required' });
      }

      let insertedCount = 0;
      for (const t of trades) {
        const id = String(t.id || '').trim();
        if (!id) continue;

        const itemId = parseInt(t.itemId || 0, 10);
        const itemName = String(t.itemName || t.name || `Item #${itemId}`).substring(0, 128);
        const quantity = parseFloat(t.quantity || 1);
        const sfl = parseFloat(t.sfl || 0);
        const unitPrice = quantity > 0 ? (sfl / quantity) : sfl;
        const tradeType = String(t.tradeType || 'sold').toLowerCase();
        const source = String(t.source || 'listing').toLowerCase();
        const counterpartyId = t.counterpartyId ? String(t.counterpartyId).trim() : null;
        const counterpartyName = t.counterpartyName ? String(t.counterpartyName).substring(0, 128) : null;
        const fulfilledAt = parseInt(t.fulfilledAt || Date.now(), 10);
        const fulfilledDate = new Date(fulfilledAt).toISOString().slice(0, 19).replace('T', ' ');

        const insertSql = `
          INSERT IGNORE INTO user_trades 
          (id, farm_id, item_id, item_name, quantity, sfl, unit_price, trade_type, source, counterparty_id, counterparty_name, fulfilled_at, fulfilled_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
          const [result] = await pool.query(insertSql, [
            id, farmId, itemId, itemName, quantity, sfl, unitPrice, tradeType, source, counterpartyId, counterpartyName, fulfilledAt, fulfilledDate
          ]);
          if (result && result.affectedRows > 0) {
            insertedCount += result.affectedRows;
          }
        } catch (queryErr) {
          console.warn("Trade insert row warning:", queryErr.message);
        }
      }

      let totalInCloud = 0;
      try {
        const [countRes] = await pool.query('SELECT COUNT(*) as total FROM user_trades WHERE farm_id = ?', [farmId]);
        totalInCloud = countRes[0]?.total || 0;
      } catch (countErr) {
        totalInCloud = insertedCount;
      }

      return res.status(200).json({
        success: true,
        configured: true,
        savedNewTrades: insertedCount,
        totalArchivedTrades: totalInCloud
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

        return {
          id: r.id,
          farmId: r.farm_id,
          itemId: r.item_id,
          itemName: r.item_name,
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
