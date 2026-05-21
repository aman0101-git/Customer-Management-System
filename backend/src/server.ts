// ============================================================================
// backend/src/server.ts
// ----------------------------------------------------------------------------
// Phase 9 (May 2026) additions:
//   1. validateEnv() — fail-fast check before any I/O. If required env vars
//      are missing or malformed the process exits immediately with a clear msg.
//   2. Graceful shutdown — handles SIGTERM (systemd/PM2/K8s) and SIGINT
//      (Ctrl-C in dev). Stops accepting new connections, waits up to 10s for
//      in-flight requests to complete, then closes the DB pool cleanly.
//      Prevents connection leaks and dropped requests during deploys.
// ============================================================================
import 'dotenv/config';
import app from './app.js';
import { checkDatabaseConnection } from './config/db.health.js';
import { closePool } from './config/db.js';
import { validateEnv } from './lib/validateEnv.js';
import { logger } from './lib/logger.js';

// Validate env before any network I/O — exits process on failure.
validateEnv();

const PORT = Number(process.env.PORT);

async function startServer(): Promise<void> {
  await checkDatabaseConnection();

  const server = app.listen(PORT, () => {
    logger.info('Server started', { port: PORT, node_env: process.env.NODE_ENV ?? 'development' });
  });

  // ----- GRACEFUL SHUTDOWN -----
  // Called by both SIGTERM (production process manager) and SIGINT (dev Ctrl-C).
  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — shutting down gracefully`);

    // Stop accepting new HTTP connections.
    server.close(async () => {
      logger.info('HTTP server closed');

      // Close DB pool after all in-flight HTTP handlers finish.
      await closePool();
      logger.info('Database pool closed — exiting');
      process.exit(0);
    });

    // Force-exit if graceful shutdown takes longer than 10 seconds.
    setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000).unref();
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  // Catch unhandled promise rejections — log and exit so the process manager
  // can restart cleanly rather than running in a degraded state.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection — initiating shutdown', { err: reason });
    void shutdown('unhandledRejection');
  });
}

startServer();
