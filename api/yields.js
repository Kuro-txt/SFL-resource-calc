import mysql from 'mysql2/promise';

const CROP_FLOWER_PRICES = {
  "sunflower": 0.0003,
  "potato": 0.00031,
  "pumpkin": 0.0010,
  "carrot": 0.00186,
  "cabbage": 0.00146,
  "beetroot": 0.0060,
  "cauliflower": 0.00675,
  "parsnip": 0.0120,
  "eggplant": 0.0080,
  "corn": 0.0111,
  "radish": 0.00859,
  "wheat": 0.01866,
  "kale": 0.0185,
  "soybean": 0.0018,
  "barley": 0.0200,
  "rhubarb": 0.00058,
  "zucchini": 0.00061,
  "yam": 0.00251,
  "broccoli": 0.00363,
  "pepper": 0.00697,
  "onion": 0.01214,
  "turnip": 0.01061,
  "artichoke": 0.00983,
  "grape": 0.23666,
  "rice": 0.25658,
  "olive": 0.29894,
  "tomato": 0.00478,
  "lemon": 0.00986,
  "blueberry": 0.01384,
  "orange": 0.01399,
  "apple": 0.01830,
  "banana": 0.01998
};

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
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 4,
        maxIdle: 2,
        idleTimeout: 30000,
        queueLimit: 0
      });
    } else {
      pool = mysql.createPool({ uri: config.cleanUrl, database: db, ssl: { rejectUnauthorized: false } });
    }
  }
  return pool;
}

async function ensureYieldsTableCreated(pool, dbName = 'test') {
  if (isTableReady || !pool) return;
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS user_daily_yields (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      farm_id BIGINT NOT NULL,
      yield_date DATE NOT NULL,
      total_count DECIMAL(20, 4) NOT NULL,
      net_flowers DECIMAL(20, 4) NOT NULL,
      crops JSON,
      crop_activity_yields JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_date (user_id, yield_date),
      INDEX idx_farm_date (farm_id, yield_date)
    );
  `;
  try {
    await pool.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await pool.query(`USE ${dbName}`);
    await pool.query(createTableSql);
    isTableReady = true;
  } catch (err) {
    console.warn("user_daily_yields auto-migration notice:", err.message);
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
    return res.status(200).json({ success: false, data: [], message: 'TiDB not configured' });
  }

  const pool = getTiDBPool();
  const dbName = config.database || 'test';

  try {
    await ensureYieldsTableCreated(pool, dbName);

    if (req.method === 'GET') {
      const { farmId, userId } = req.query;

      let query = 'SELECT * FROM user_daily_yields WHERE 1=1';
      const params = [];

      if (farmId && userId) {
        query += ' AND (farm_id = ? OR user_id = ?)';
        params.push(farmId, userId);
      } else if (farmId) {
        query += ' AND farm_id = ?';
        params.push(farmId);
      } else if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      query += ' ORDER BY yield_date DESC LIMIT 100';
      const [rows] = await pool.query(query, params);

      const formatted = (rows || []).map(r => {
        let crops = typeof r.crops === 'string' ? JSON.parse(r.crops || '[]') : (r.crops || []);
        const cropActivityYields = typeof r.crop_activity_yields === 'string' ? JSON.parse(r.crop_activity_yields || '[]') : (r.crop_activity_yields || []);

        if ((!crops || crops.length === 0) && Array.isArray(cropActivityYields) && cropActivityYields.length > 0) {
          crops = cropActivityYields.map(c => ({
            name: c.crop || c.name || 'Crop',
            qty: parseFloat(c.totalProduced || c.qty || c.harvestCount || 0),
            flowers: parseFloat(c.netFlowers || c.flowers || 0)
          }));
        }

        crops = crops.map(c => {
          const cropName = c.name || c.item || 'Crop';
          const cleanKey = cropName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const qty = parseFloat(c.qty || 0);
          let fl = parseFloat(c.flowers || 0);
          if (fl > (qty * 1.5) || fl <= 0) {
            const fallbackP = CROP_FLOWER_PRICES[cleanKey] || 0.01;
            fl = Math.ceil(fallbackP * qty * 0.9 * 1000) / 1000;
          }
          return {
            name: cropName,
            qty: qty,
            flowers: fl
          };
        });

        const totalNetFlowers = crops.length > 0 
          ? crops.reduce((sum, c) => sum + (parseFloat(c.flowers) || 0), 0)
          : parseFloat(r.net_flowers || 0);

        return {
          date: r.yield_date ? new Date(r.yield_date).toISOString().split('T')[0] : '',
          totalCount: parseFloat(r.total_count || 0),
          netFlowers: totalNetFlowers.toFixed(3),
          crops: crops,
          cropActivityYields: cropActivityYields
        };
      });

      return res.status(200).json({ success: true, data: formatted });
    }

    if (req.method === 'POST') {
      const { userId, farmId, date, totalCount, netFlowers, crops, cropActivityYields } = req.body || {};
      if (!userId || !date) {
        return res.status(400).json({ error: 'userId and date required' });
      }

      const tidbId = `yield_${userId}_${date}`;
      const insertSql = `
        INSERT INTO user_daily_yields 
        (id, user_id, farm_id, yield_date, total_count, net_flowers, crops, crop_activity_yields)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          total_count = VALUES(total_count),
          net_flowers = VALUES(net_flowers),
          crops = VALUES(crops),
          crop_activity_yields = VALUES(crop_activity_yields)
      `;

      await pool.query(insertSql, [
        tidbId,
        userId,
        farmId || 0,
        date,
        parseFloat(totalCount || 0),
        parseFloat(netFlowers || 0),
        JSON.stringify(crops || []),
        JSON.stringify(cropActivityYields || [])
      ]);

      return res.status(200).json({ success: true, saved: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
