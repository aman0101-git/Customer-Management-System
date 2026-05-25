// ============================================================================
// backend/src/config/db.ts
// ----------------------------------------------------------------------------
// Production optimization (May 2026):
//   1. connectionLimit raised from 10 → 30 (env-tunable via DB_POOL_LIMIT).
//      Sized for 500+ concurrent users; MySQL default max is 151.
//   2. timezone forced to 'Z' to prevent date drift between Node and MySQL
//      when servers are in different time zones.
//   3. Graceful pool shutdown helper added.
// ============================================================================
import mysql from 'mysql2/promise';
import 'dotenv/config';

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // ----- POOL SIZING -----
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 30,
  waitForConnections: true,
  queueLimit: 0,

  // ----- KEEP-ALIVE / RECONNECT -----
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,

  // ----- CONSISTENCY -----
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: false,

  // ----- SAFETY -----
  multipleStatements: false,
  decimalNumbers: false,
});

db.pool.on('error', (err: any) => {
  console.error('Unexpected Database Background Error:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('The database closed an idle connection. The pool will auto-reconnect.');
  }
});

// Helper: wire into your SIGTERM handler if you want clean shutdown.
export async function closePool(): Promise<void> {
  try { await db.end(); } catch (e) { /* noop */ }
}
