// ============================================================================
// backend/src/lib/validateEnv.ts
// ----------------------------------------------------------------------------
// Phase 9 (May 2026): Fail-fast startup environment validation.
//
// Called once in server.ts before app.listen(). If any required variable is
// missing the process exits immediately with a clear, actionable message
// rather than starting up and crashing cryptically on the first DB call or
// JWT sign operation.
//
// Required vars:
//   JWT_SECRET  — must be set and non-trivially short (≥ 32 chars)
//   DB_HOST     — MySQL host
//   DB_USER     — MySQL user
//   DB_PASSWORD — MySQL password
//   DB_NAME     — MySQL database name
//   PORT        — HTTP listen port
// ============================================================================

import { logger } from './logger.js';

interface EnvRule {
  name: string;
  /** Optional extra validator beyond "must exist". Returns error string or null. */
  validate?: (value: string) => string | null;
}

const REQUIRED: EnvRule[] = [
  { name: 'JWT_SECRET',
    validate: (v) =>
      v.length < 32
        ? `JWT_SECRET is too short (${v.length} chars). Use at least 32 random chars.`
        : null,
  },
  { name: 'DB_HOST'     },
  { name: 'DB_USER'     },
  { name: 'DB_PASSWORD' },
  { name: 'DB_NAME'     },
  { name: 'PORT',
    validate: (v) =>
      isNaN(Number(v)) || Number(v) < 1 || Number(v) > 65535
        ? `PORT must be a valid port number (got: "${v}")`
        : null,
  },
];

export function validateEnv(): void {
  const errors: string[] = [];

  for (const rule of REQUIRED) {
    const value = process.env[rule.name];

    if (!value) {
      errors.push(`Missing required environment variable: ${rule.name}`);
      continue;
    }

    if (rule.validate) {
      const err = rule.validate(value);
      if (err) errors.push(err);
    }
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed — server cannot start', {
      errors,
    });
    for (const e of errors) {
      // Also write to stderr individually so each line is visible in PM2/systemd logs
      process.stderr.write(`  ✗ ${e}\n`);
    }
    process.exit(1);
  }

  logger.info('Environment validated', {
    node_env: process.env.NODE_ENV ?? 'development',
    port:     process.env.PORT,
    db_host:  process.env.DB_HOST,
    db_name:  process.env.DB_NAME,
  });
}
