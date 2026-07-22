import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.CACHE_DB_PATH || path.join(process.cwd(), 'data', 'cache.db');

// Singleton instance
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  // Check if database is open (better-sqlite3 has an 'open' property)
  if (db && (db as unknown as { open: boolean }).open) {
    return db;
  }

  // If database was closed or doesn't exist, create a new one
  const dbPath = process.env.CACHE_DB_PATH || DB_PATH;
  
  // Create data directory if it doesn't exist
  if (dbPath !== ':memory:') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Better performance for concurrent reads/writes
  initializeSchema(db);
  return db;
}

export function closeDatabase(): void {
  if (db && (db as unknown as { open: boolean }).open) {
    db.close();
    db = null;
  }
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cache_type ON cache(type);
    CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);

    CREATE TABLE IF NOT EXISTS cache_stats (
      type TEXT PRIMARY KEY,
      hit_count INTEGER DEFAULT 0,
      miss_count INTEGER DEFAULT 0,
      last_accessed INTEGER
    );
  `);

  // Stale-while-revalidate support: fresh_until marks the freshness window;
  // expires_at becomes the hard retention deadline. Pre-migration rows get
  // fresh_until = expires_at (fresh right up to deletion — old behavior).
  const cacheColumns = database.prepare(`PRAGMA table_info(cache)`).all() as { name: string }[];
  if (!cacheColumns.some((column) => column.name === "fresh_until")) {
    database.exec(`
      ALTER TABLE cache ADD COLUMN fresh_until INTEGER;
      UPDATE cache SET fresh_until = expires_at WHERE fresh_until IS NULL;
    `);
  }
}

// Clean up expired entries periodically
export function cleanupExpiredCache(): number {
  const db = getDatabase();
  const now = Date.now();
  const result = db.prepare('DELETE FROM cache WHERE expires_at < ?').run(now);
  return result.changes;
}

