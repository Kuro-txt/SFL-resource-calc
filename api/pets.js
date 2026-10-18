import mysql from 'mysql2/promise';
import crypto from 'crypto';

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
        uri: config.cleanUrl || config.uri,
        database: db,
        ssl: { rejectUnauthorized: false }
      });
    }
  }
  return pool;
}

async function ensurePetsTablesCreated(pool, dbName = 'test') {
  if (isTableReady) return;

  const eventsSql = `
    CREATE TABLE IF NOT EXISTS pet_feed_events (
      id VARCHAR(64) PRIMARY KEY,
      farm_id BIGINT NOT NULL,
      pet_name VARCHAR(64) NOT NULL,
      fed_at BIGINT NOT NULL,
      energy_gained INT NOT NULL,
      total_energy INT DEFAULT 0,
      foods_fed JSON NOT NULL,
      cost_sfl DECIMAL(20, 4) NOT NULL DEFAULT 0,
      cost_per_energy DECIMAL(20, 6) DEFAULT 0,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_farm_fed (farm_id, fed_at DESC),
      INDEX idx_pet_fed (pet_name, fed_at DESC)
    );
  `;

  const preferencesSql = `
    CREATE TABLE IF NOT EXISTS pet_preferences (
      farm_id BIGINT PRIMARY KEY,
      opt_in BOOLEAN DEFAULT TRUE,
      walrus_onesie BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `;

  try {
    if (pool) {
      await pool.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      await pool.query(`USE ${dbName}`);
      await pool.query(eventsSql);
      await pool.query(preferencesSql);
      isTableReady = true;
    }
  } catch (err) {
    console.warn("Notice: TiDB pet tables initialization:", err.message);
  }
}

function generateEventId(farmId, petName, fedAt) {
  return crypto.createHash('md5')
    .update(`${String(farmId)}_${String(petName)}_${String(fedAt)}`)
    .digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const tidbPool = getTiDBPool();
  if (!tidbPool) {
    return res.status(503).json({
      error: 'TiDB Cloud not configured',
      message: 'Add TIDB_DATABASE_URL to Environment Variables.'
    });
  }

  try {
    await ensurePetsTablesCreated(tidbPool);

    // ── GET: Load Pet Feeding Ledger & Preferences ────────────────────────────
    if (req.method === 'GET') {
      const { farmId, limit = 100 } = req.query;
      const cleanFarmId = farmId ? String(farmId).replace(/[^0-9]/g, '') : '';

      if (!cleanFarmId) {
        return res.status(400).json({ error: 'farmId query parameter is required' });
      }

      const parsedLimit = Math.min(300, Math.max(1, parseInt(limit, 10) || 100));

      const [events] = await tidbPool.query(
        `SELECT id, farm_id as farmId, pet_name as petName, fed_at as fedAt, energy_gained as energyGained, 
                total_energy as totalEnergy, foods_fed as foodsFed, cost_sfl as costSfl, 
                cost_per_energy as costPerEnergy, logged_at as loggedAt
         FROM pet_feed_events
         WHERE farm_id = ?
         ORDER BY fed_at DESC
         LIMIT ?`,
        [cleanFarmId, parsedLimit]
      );

      const [prefs] = await tidbPool.query(
        `SELECT farm_id as farmId, opt_in as optIn, walrus_onesie as walrusOnesie, updated_at as updatedAt
         FROM pet_preferences
         WHERE farm_id = ?
         LIMIT 1`,
        [cleanFarmId]
      );

      // Parse JSON foods_fed if returned as string
      const formattedEvents = (events || []).map(row => {
        let foodsFed = row.foodsFed;
        if (typeof foodsFed === 'string') {
          try { foodsFed = JSON.parse(foodsFed); } catch (_) { foodsFed = [foodsFed]; }
        }
        return {
          ...row,
          foodsFed,
          costSfl: parseFloat(row.costSfl) || 0,
          costPerEnergy: parseFloat(row.costPerEnergy) || 0
        };
      });

      return res.status(200).json({
        success: true,
        farmId: cleanFarmId,
        events: formattedEvents,
        preferences: prefs?.[0] || null
      });
    }

    // ── POST: Save Pet Feeding Events & Preferences ───────────────────────────
    if (req.method === 'POST') {
      const body = req.body || {};
      const cleanFarmId = body.farmId ? String(body.farmId).replace(/[^0-9]/g, '') : '';

      if (!cleanFarmId) {
        return res.status(400).json({ error: 'farmId is required in body' });
      }

      let eventsToSave = [];
      if (Array.isArray(body.events)) {
        eventsToSave = body.events;
      } else if (body.entry && typeof body.entry === 'object') {
        eventsToSave = [body.entry];
      }

      let savedCount = 0;

      for (const entry of eventsToSave) {
        if (!entry.petName || !entry.fedAt) continue;

        const eventId = entry.id || generateEventId(cleanFarmId, entry.petName, entry.fedAt);
        const petName = String(entry.petName).slice(0, 64);
        const fedAt = parseInt(entry.fedAt, 10);
        const energyGained = parseInt(entry.energyGained, 10) || 0;
        const totalEnergy = parseInt(entry.totalEnergy, 10) || 0;
        const foodsFed = JSON.stringify(Array.isArray(entry.foodsFed) ? entry.foodsFed : []);
        const costSfl = parseFloat(entry.costSfl) || 0;
        const costPerEnergy = parseFloat(entry.costPerEnergy) || 0;
        const loggedAt = entry.loggedAt ? new Date(entry.loggedAt) : new Date();

        await tidbPool.query(
          `INSERT INTO pet_feed_events 
            (id, farm_id, pet_name, fed_at, energy_gained, total_energy, foods_fed, cost_sfl, cost_per_energy, logged_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
            energy_gained = VALUES(energy_gained),
            total_energy = VALUES(total_energy),
            cost_sfl = VALUES(cost_sfl),
            cost_per_energy = VALUES(cost_per_energy)`,
          [eventId, cleanFarmId, petName, fedAt, energyGained, totalEnergy, foodsFed, costSfl, costPerEnergy, loggedAt]
        );
        savedCount++;
      }

      // Update preferences if provided
      if (body.optIn !== undefined || body.walrusOnesie !== undefined) {
        const optIn = body.optIn !== undefined ? Boolean(body.optIn) : true;
        const walrusOnesie = body.walrusOnesie !== undefined ? Boolean(body.walrusOnesie) : false;

        await tidbPool.query(
          `INSERT INTO pet_preferences (farm_id, opt_in, walrus_onesie)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
            opt_in = VALUES(opt_in),
            walrus_onesie = VALUES(walrus_onesie)`,
          [cleanFarmId, optIn, walrusOnesie]
        );
      }

      return res.status(200).json({
        success: true,
        farmId: cleanFarmId,
        savedCount
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error("TiDB Pet Handler Error:", err);
    return res.status(500).json({
      error: 'TiDB operation failed',
      message: err.message
    });
  }
}
