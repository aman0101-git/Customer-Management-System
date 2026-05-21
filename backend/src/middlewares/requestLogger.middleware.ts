// ============================================================================
// backend/src/middlewares/requestLogger.middleware.ts
// ----------------------------------------------------------------------------
// Phase 9 (May 2026): HTTP access logging middleware.
//
// Logs every completed request with: method, path, status code, duration (ms),
// and the request ID. Uses the res.on('finish') event pattern so the status
// code is always the final, written status — not a pre-response guess.
//
// Log level strategy (avoids noisy 404 storms drowning real errors):
//   2xx / 3xx  → info
//   4xx        → warn   (client errors — useful for auth failure trends)
//   5xx        → error  (server errors — highest priority)
//
// What is NOT logged:
//   - Request body (contains customer PII and passwords)
//   - Query parameters in full (could contain phone numbers)
//   - Response body
//   - Authorization / Cookie headers
//
// This keeps the log volume predictable and PII-clean.
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();

  // Sanitize path: strip query string (may contain phone numbers / customer IDs
  // that aren't critical to log at the access-log level).
  const path = req.path;

  res.on('finish', () => {
    const ms     = Date.now() - startedAt;
    const status = res.statusCode;
    const ctx    = {
      requestId: req.requestId,
      method:    req.method,
      path,
      status,
      ms,
      userId: req.user?.id,
    };

    if (status >= 500) {
      logger.error(`${req.method} ${path} ${status}`, ctx);
    } else if (status >= 400) {
      logger.warn(`${req.method} ${path} ${status}`, ctx);
    } else {
      logger.info(`${req.method} ${path} ${status}`, ctx);
    }
  });

  next();
}
