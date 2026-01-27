import app from './app.js';
import 'dotenv/config';
import { checkDatabaseConnection } from './config/db.health.js';

const PORT = process.env.PORT;

async function startServer() {
  await checkDatabaseConnection();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
