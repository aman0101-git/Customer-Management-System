// ============================================================================
// backend/src/middlewares/errorHandler.middleware.ts
// ----------------------------------------------------------------------------
// Phase 9 (May 2026): Global Express error handler.
//
// Must be registered as the LAST middleware in app.ts — Express identifies
// error handlers by their 4-argument signature (err, req, res, next).
//
// In Express 5 (which this project uses), async route handlers that throw
// automatically propagate to this handler without needing explicit next(err)
// calls. This means unguarded async controllers (like createProject) are
// now safely caught here even without try/catch.
//
// Behaviour:
//   1. Logs the full error with stack trace in dev; sanitized message in prod.
//   2. Honours status codes attached to errors (err.status / err.statusCode).
//   3. Always returns a consistent JSON body: { message, requestId }.
//      This makes frontend error handling deterministic — no more mixed
//      { message } vs { error } shapes for unhandled server errors.
//   4. Never leaks internal error details (stack traces, SQL) to the client.
//
// Note: If res.headersSent is true (streaming response already started),
// we delegate to Express's default handler — can't write a JSON body at
// that point (xlsx/csv export endpoint).
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // If a streaming response has started (xlsx export), let Express handle it.
  if (res.headersSent) {
    return;
  }

  const status  = err.status ?? err.statusCode ?? 500;
  const message = status >= 500
    ? 'Internal Server Error'          // Never leak internal details to client
    : (err.message || 'Request failed');

  logger.error('Unhandled error', {
    requestId: req.requestId,
    method:    req.method,
    path:      req.path,
    status,
    userId:    req.user?.id,
    err,
  });

  res.status(status).json({
    message,
    requestId: req.requestId,
  });
}
