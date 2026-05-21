// ============================================================================
// backend/src/middlewares/rateLimiter.middleware.ts
// ----------------------------------------------------------------------------
// Phase 9 (May 2026): In-memory sliding-window rate limiter for auth routes.
//
// Applied ONLY to POST /auth/login — the only unauthenticated mutation
// endpoint in the system. Authenticated endpoints are already protected by
// the JWT middleware; rate limiting those is unnecessary noise.
//
// Design:
//   - No external package — pure in-memory Map (acceptable for single-process
//     deployments; if the AMS ever goes multi-process/multi-instance, replace
//     with Redis-backed rate limiting at that point).
//   - Sliding window per IP: stores an array of timestamps for the current
//     window and evicts expired entries on each check.
//   - Window: 15 minutes / 10 attempts. After 10 failed requests from the
//     same IP in any 15-minute window, return 429 with Retry-After header.
//   - IP derived from req.ip (trust proxy is already set in app.ts, so
//     X-Forwarded-For is respected behind nginx/cloudflare).
//   - Successful logins do NOT reset the counter — counting attempts, not
//     outcomes, prevents timing attacks.
//   - Map is cleaned periodically to prevent memory growth from bot IPs that
//     each send a burst and then disappear.
//
// Tuning via env vars (optional):
//   RATE_LIMIT_LOGIN_MAX    — max attempts per window (default: 10)
//   RATE_LIMIT_LOGIN_MS     — window duration in ms (default: 900000 = 15min)
// ============================================================================

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

const MAX_ATTEMPTS = Number(process.env.RATE_LIMIT_LOGIN_MAX)  || 10;
const WINDOW_MS    = Number(process.env.RATE_LIMIT_LOGIN_MS)   || 15 * 60 * 1000; // 15 min

// Map<ip, timestamp[]> — each entry is the array of attempt timestamps within
// the current window for that IP.
const store = new Map<string, number[]>();

// Periodic cleanup: remove IPs whose last attempt was older than 2 windows.
// Runs every 10 minutes — prevents unbounded Map growth from scanners.
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function scheduleCleanup(): void {
  if (cleanupTimer !== null) return; // Already scheduled
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS * 2;
    for (const [ip, timestamps] of store) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] < cutoff) {
        store.delete(ip);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't keep the Node process alive solely for this timer.
  if (cleanupTimer.unref) cleanupTimer.unref();
}

scheduleCleanup();

export function loginRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ip = req.ip ?? 'unknown';

  // Sliding window: keep only timestamps within the current window.
  const now    = Date.now();
  const cutoff = now - WINDOW_MS;

  let attempts = (store.get(ip) ?? []).filter((t) => t >= cutoff);
  attempts.push(now);
  store.set(ip, attempts);

  if (attempts.length > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil(WINDOW_MS / 1000);

    logger.warn('Login rate limit exceeded', {
      requestId: req.requestId,
      ip,
      attempts: attempts.length,
      window_ms: WINDOW_MS,
    });

    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      message: `Too many login attempts. Please try again in ${Math.ceil(WINDOW_MS / 60_000)} minutes.`,
      requestId: req.requestId,
    });
    return;
  }

  next();
}
