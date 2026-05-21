// ============================================================================
// backend/src/lib/logger.ts
// ----------------------------------------------------------------------------
// Phase 9 (May 2026): Lightweight structured logging utility.
//
// Design constraints:
//   - Zero external dependencies — wraps console only.
//   - JSON format in production (stdout-parseable by log aggregators).
//   - Human-readable format in development.
//   - Optional context object for request IDs, user IDs, and other fields.
//   - Log levels: debug | info | warn | error.
//
// Usage:
//   import { logger } from '../lib/logger.js';
//   logger.info('Server started', { port: 3000 });
//   logger.warn('Slow query', { ms: 1200, query: 'getSupervisorFollowUps' });
//   logger.error('Unhandled error', { requestId: req.requestId, err });
//
// What NOT to log (PII / security):
//   - Request body payloads (contain customer PII)
//   - Passwords or tokens
//   - Customer contact numbers in structured fields
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: number;
  method?: string;
  path?: string;
  status?: number;
  ms?: number;
  err?: unknown;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === 'production';
const IS_DEBUG = process.env.LOG_LEVEL === 'debug';

// Numeric weight per level — used to filter below threshold.
const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

const MIN_WEIGHT = IS_DEBUG ? 0 : IS_PROD ? 1 : 0;

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= MIN_WEIGHT;
}

function serializeError(err: unknown): string | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return IS_PROD
      ? err.message                                   // No stack trace in prod logs (clean output)
      : `${err.message}\n${err.stack ?? ''}`;         // Full stack in dev
  }
  return String(err);
}

function formatProd(level: LogLevel, message: string, ctx?: LogContext): string {
  const entry: Record<string, unknown> = {
    ts:    new Date().toISOString(),
    level,
    msg:   message,
  };

  if (ctx) {
    const { err, ...rest } = ctx;
    Object.assign(entry, rest);
    if (err !== undefined) entry.err = serializeError(err);
  }

  return JSON.stringify(entry);
}

function formatDev(level: LogLevel, message: string, ctx?: LogContext): string {
  const ts       = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const levelPad = level.toUpperCase().padEnd(5);
  const rid      = ctx?.requestId ? ` [${ctx.requestId}]` : '';
  const extra    = ctx
    ? Object.entries(ctx)
        .filter(([k, v]) => k !== 'err' && v !== undefined)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ')
    : '';

  const errStr = ctx?.err ? `\n  ${serializeError(ctx.err)}` : '';
  return `${ts} ${levelPad}${rid} ${message}${extra ? '  ' + extra : ''}${errStr}`;
}

function write(level: LogLevel, message: string, ctx?: LogContext): void {
  if (!shouldLog(level)) return;

  const line = IS_PROD
    ? formatProd(level, message, ctx)
    : formatDev(level, message, ctx);

  // error and warn → stderr; info/debug → stdout
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  debug: (message: string, ctx?: LogContext) => write('debug', message, ctx),
  info:  (message: string, ctx?: LogContext) => write('info',  message, ctx),
  warn:  (message: string, ctx?: LogContext) => write('warn',  message, ctx),
  error: (message: string, ctx?: LogContext) => write('error', message, ctx),
};
