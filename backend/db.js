const mysql = require('mysql2/promise');

function parseMySqlUrl(rawUrl) {
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

let tidbPool = null;
function getTiDBPool() {
  const rawUrl = process.env.TIDB_DATABASE_URL || process.env.DATABASE_URL || process.env.TIDB_URL || process.env.MYSQL_URL || '';
  if (!rawUrl) return null;
  if (!tidbPool) {
    const config = parseMySqlUrl(rawUrl);
    if (!config) return null;

    if (config.host && config.user) {
      tidbPool = mysql.createPool({
        host: config.host,
        port: config.port || 4000,
        user: config.user,
        password: config.password,
        database: config.database || 'test',
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 4,
        maxIdle: 2,
        idleTimeout: 30000,
        queueLimit: 0
      });
    } else {
      tidbPool = mysql.createPool({ uri: config.uri || rawUrl, database: 'test', ssl: { rejectUnauthorized: false } });
    }
  }
  return tidbPool;
}

// Yields are stored exclusively in Supabase (daily_yields).
// TiDB Cloud is reserved exclusively for marketplace trades (user_trades).
async function ensureYieldsTableCreated() {
  // No-op: user_daily_yields in TiDB is deprecated
}

module.exports = {
  parseMySqlUrl,
  getTiDBPool,
  ensureYieldsTableCreated,
  tidbPool
};
