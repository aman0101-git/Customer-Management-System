// ============================================================================
// backend/src/app.ts
// ----------------------------------------------------------------------------
// Production optimization (May 2026):
//   1. + compression middleware  (gzip/brotli) — reduces dashboard JSON 70-85%.
//   2. + express.json limit set to 1mb (explicit; safe for our payloads).
//   3. + trust proxy hint — required behind nginx/cloudflare.
//   4. + /healthz endpoint for load balancer health checks (no DB hit).
//
// One-time install required:
//   cd backend && npm install compression
//   npm install --save-dev @types/compression
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

const app = express();

// Behind nginx / load balancer (safe even if not — only affects req.ip)
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://192.168.1.14:5173',
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

app.use('/auth', authRoutes);
app.use('/api/agent/customers', customerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/supervisor/whatsapp', whatsappRoutes);
app.use('/api/agent/whatsapp', whatsappRoutes);

// Lightweight health endpoint for load balancers (no DB hit)
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

export default app;
