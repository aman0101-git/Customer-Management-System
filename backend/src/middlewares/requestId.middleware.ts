// ============================================================================
// backend/src/middlewares/requestId.middleware.ts
// ----------------------------------------------------------------------------
// Phase 9 (May 2026): Request correlation ID middleware.
//
// Attaches a unique ID to every inbound request so that a single transaction
// (login attempt, reassignment, follow-up update) can be traced across all
// log lines it generates — even when multiple requests are interleaved in the
// same log stream.
//
// Behaviour:
//   1. If the caller sends X-Request-ID header, re-use it (allows the frontend
//      to pass its own trace ID for end-to-end correlation on bug reports).
//   2. Otherwise generate a new UUID v4 via Node's built-in crypto module
//      (no dependency — available since Node 14.17).
//   3. Attach the ID to req.requestId (TypeScript typed in express.d.ts).
//   4. Echo the ID back in the X-Request-ID response header so the browser
//      can capture it (useful for support tickets).
// ============================================================================

import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Honour caller-supplied ID (e.g. from browser fetch with X-Request-ID set).
  // Guard: only accept safe alphanumeric + dash values to prevent header injection.
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && /^[\w\-]{8,64}$/.test(incoming)
      ? incoming
      : randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}
