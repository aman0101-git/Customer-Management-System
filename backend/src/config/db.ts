import mysql from 'mysql2/promise';
import 'dotenv/config';

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

db.pool.on('error', (err: any) => {
  console.error('Unexpected Database Background Error:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('The database closed an idle connection. The pool will auto-reconnect.');
  }
});
