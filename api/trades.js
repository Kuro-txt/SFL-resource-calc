import mysql from 'mysql2/promise';

let pool = null;

function getTiDBPool() {
  const databaseUrl = 
    process.env.TIDB_DATABASE_URL || 
    process.env.DATABASE_URL || 
    process.env.TIDB_URL || 
    process.env.MYSQL_URL || 
    '';

  if (!databaseUrl) return null;

  if (!pool) {
    // Parse connection string or pass uri
    const cleanUrl = databaseUrl.trim().replace(/^['"]|['"]$/g, '');
    pool = mysql.createPool({
      uri: cleanUrl,
      ssl: {
        rejectUnauthorized: true
      },
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0
    });
  }
  return pool;
}

async function ensureTableCreated(conn) {
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
  await conn.query(schemaSql);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = getTiDBPool();
  if (!pool) {
    return res.status(200).json({ 
      success: false, 
      configured: false,
      message: 'TiDB Cloud not configured. Add TIDB_DATABASE_URL to Vercel Environment Variables.' 
    });
  }

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

        const itemId = parseInt(t.itemId || 0);
        const itemName = String(t.itemName || t.name || `Item #${itemId}`).substring(0, 128);
        const quantity = parseFloat(t.quantity || 1);
        const sfl = parseFloat(t.sfl || 0);
        const unitPrice = quantity > 0 ? (sfl / quantity) : sfl;
        const tradeType = String(t.tradeType || 'sold').toLowerCase();
        const source = String(t.source || 'listing').toLowerCase();
        const counterpartyId = t.counterpartyId ? parseInt(t.counterpartyId) : null;
        const counterpartyName = t.counterpartyName ? String(t.counterpartyName).substring(0, 128) : null;
        const fulfilledAt = parseInt(t.fulfilledAt || Date.now());
        const fulfilledDate = new Date(fulfilledAt).toISOString().slice(0, 19).replace('T', ' ');

        const insertSql = `
          INSERT IGNORE INTO user_trades 
          (id, farm_id, item_id, item_name, quantity, sfl, unit_price, trade_type, source, counterparty_id, counterparty_name, fulfilled_at, fulfilled_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(insertSql, [
          id, farmId, itemId, itemName, quantity, sfl, unitPrice, tradeType, source, counterpartyId, counterpartyName, fulfilledAt, fulfilledDate
        ]);

        if (result && result.affectedRows > 0) {
          insertedCount += result.affectedRows;
        }
      }

      const [countRes] = await pool.query('SELECT COUNT(*) as total FROM user_trades WHERE farm_id = ?', [farmId]);
      const totalInCloud = countRes[0]?.total || 0;

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

      const [rows] = await pool.query(
        'SELECT * FROM user_trades WHERE farm_id = ? ORDER BY fulfilled_at DESC LIMIT 5000',
        [farmId]
      );

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
    return res.status(500).json({
      success: false,
      error: 'TiDB Cloud operation failed',
      details: error.message
    });
  }
}
