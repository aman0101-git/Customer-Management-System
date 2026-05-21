// ============================================================================
// backend/src/app.ts
// ----------------------------------------------------------------------------
// Production optimization (May 2026):
//   1. + compression middleware  (gzip/brotli) — reduces dashboard JSON 70-85%.
//   2. + express.json limit set to 1mb (explicit; safe for our payloads).
//   3. + trust proxy hint — required behind nginx/cloudflare.
//   4. + /healthz endpoint for load balancer health checks (no DB hit).
//
// Phase 9 (May 2026) — Backend Hardening:
//   5. + requestId middleware — correlation IDs on every request.
//   6. + requestLogger middleware — structured HTTP access log.
//   7. + errorHandler middleware — global error handler (last in chain).
//   8. + loginRateLimiter on POST /auth/login — 10 attempts / 15 min / IP.
//
// One-time install required for compression (already done):
//   cd backend && npm install compression @types/compression
// ============================================================================
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import authRoutes from './modules/auth/auth.routes.js';
import customerRoutes from './modules/customers/customer.routes.js';
import userRoutes from './modules/users/user.routes.js';
import projectRoutes from './modules/projects/project.routes.js';
import supervisorRoutes from './modules/supervisor/supervisor.routes.js';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes.js';

// Phase 9 middleware
import { requestId }      from './middlewares/requestId.middleware.js';
import { requestLogger }  from './middlewares/requestLogger.middleware.js';
import { errorHandler }   from './middlewares/errorHandler.middleware.js';

const app = express();

// Behind nginx / load balancer (safe even if not — only affects req.ip)
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ----- COMPRESSION -----
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ----- PHASE 9: OBSERVABILITY -----
// requestId must be first so all subsequent middleware + route handlers have
// access to req.requestId for logging and error responses.
app.use(requestId);
app.use(requestLogger);

// ----- ROUTES -----
app.use('/auth', authRoutes);
app.use('/api/agent/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/supervisor/whatsapp', whatsappRoutes);
app.use('/api/agent/whatsapp', whatsappRoutes);

// Lightweight health endpoint for load balancers (no DB hit)
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// ----- PHASE 9: GLOBAL ERROR HANDLER -----
// Must be registered AFTER all routes. Express identifies this as an error
// handler by its 4-argument signature. Catches any unhandled throw from an
// async route handler (Express 5 auto-propagates async errors).
app.use(errorHandler);

export default app;
