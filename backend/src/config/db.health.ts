import { db } from './db.js';

export async function checkDatabaseConnection(): Promise<void> {
  try {
    await db.query('SELECT 1');
    console.log('MySQL connected successfully');
  } catch (error) {
    console.error('MySQL connection failed');
    console.error(error);
    process.exit(1); // kill server if DB is down
  }
}
