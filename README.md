# Customer Management System (CMS)
 
> Role-based lead-management and sales-pipeline platform for a real-estate sales organization. Agents move customers through an 11-stage funnel; supervisors allocate projects, monitor team performance, and audit every interaction.
 
![status](https://img.shields.io/badge/status-production-success)
![stack](https://img.shields.io/badge/stack-React%2019%20%C2%B7%20TypeScript%20%C2%B7%20Express%205%20%C2%B7%20MySQL-blue)
 
> _Internal production system at Firstclose Solutions; source shared for portfolio review._
 
---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Data Model](#data-model)
- [Lead Pipeline](#lead-pipeline)
- [Performance & Hardening](#performance--hardening)
- [Roadmap](#roadmap)

---

## Features

**Authentication & Access Control**
- JWT issued on login and stored in an **httpOnly cookie** (8h expiry); `bcrypt` password hashing.
- Role-based access for three roles — **ADMIN**, **SUPERVISOR**, **AGENT** — enforced by `authenticate` + `authorize(...roles)` middleware and mirrored by client route guards.
- Login rate limiting (10 attempts / 15 min / IP) to resist brute force.

**Agent workspace**
- Create, search (by phone), view, update, and close customer leads.
- Advance leads through an 11-stage pipeline with budget, configuration, purpose, source, rating, and remarks.
- Follow-up scheduling and dashboards (summary, follow-ups, drill-downs, consolidated analytics).
- Per-lead audit timeline (every status change / edit is logged).

**Supervisor oversight & analytics**
- Project allocation (assign/unassign agents to projects) and agent provisioning.
- Dashboards: pipeline funnels, status distributions, visits/booking counts, follow-up monitoring.
- **Agent Performance Matrix** (agent × status, with cell drill-down).
- Global customer search, read-only customer journey/audit view, and transactional customer reassignment.
- **Excel export** of team data via `exceljs`.
- Strict data isolation: every supervisor query is scoped by `supervisor_id` so a supervisor only ever sees their own team.

**WhatsApp messaging**
- Per-project, per-trigger-event templates with `{{customer_name}}`, `{{agent_name}}`, `{{project_name}}` substitution.
- Template preview/validation and deep-link sending (`wa.me` / `web.whatsapp.com`) — the agent sends from their own WhatsApp.
- Full message logging and a supervisor WhatsApp audit log.

---

## Tech Stack

**Frontend**
- React 19, Vite, TypeScript
- TanStack Query (server state), Zustand (client state), React Router v7
- shadcn/ui + Radix primitives, Tailwind CSS, `next-themes` (dark mode), Framer Motion
- Recharts (charts), TanStack Virtual (virtualization), React Hook Form + Zod, Axios, Sonner

**Backend**
- Node.js, Express 5, TypeScript (ESM)
- MySQL via `mysql2/promise` (connection pool, raw parameterized SQL)
- `jsonwebtoken`, `bcrypt`, `cookie-parser`, `cors`, `compression`, `dotenv`, `exceljs`

---

## Architecture

Decoupled SPA + REST API + relational database.

```
React 19 SPA (Vite)  ──HTTP/JSON (axios, httpOnly cookie)──▶  Express 5 REST API  ──mysql2 pool──▶  MySQL
   TanStack Query                                              routes → controller → service           (raw parameterized SQL)
   (server-state cache)                                        (whatsapp adds a repository layer)
```

Backend middleware chain: `trust proxy → CORS → gzip compression → JSON body limit (1mb) → cookie-parser → requestId → requestLogger → routes → global errorHandler`.

App composition (frontend): `ThemeProvider → QueryProvider → AuthProvider → ErrorBoundary → AppRoutes`, with role-guarded routes.

---

## Project Structure

```
real-estate-ams/
├── backend/
│   └── src/
│       ├── app.ts                 # Express app + middleware chain
│       ├── server.ts              # bootstrap, env validation, graceful shutdown
│       ├── config/                # db pool + health check
│       ├── lib/                   # logger, validateEnv
│       ├── middlewares/           # auth, authorize, rate limiter, requestId, logger, errorHandler
│       └── modules/
│           ├── auth/              # login, JWT, user creation
│           ├── users/             # users + agent↔project assignment
│           ├── projects/          # project CRUD + agent allocation
│           ├── customers/         # lead pipeline (core) + agent analytics
│           ├── supervisor/        # analytics, export, drill-down, audit
│           └── whatsapp/          # templates, messaging, audit (routes→controller→service→repository)
├── frontend/
│   └── src/
│       ├── app/                   # layouts + routes (RequireAuth guards)
│       ├── features/              # admin / agent / supervisor / auth feature areas
│       ├── components/            # ui (shadcn), system, analytics, filters
│       ├── context/               # AuthContext
│       └── lib/ hooks/            # http client, query client, date/format utils
└── migrations/                    # SQL migrations (003–005)
```

---

## Getting Started

### Prerequisites
- Node.js 18+ (ESM)
- MySQL 8+
- npm

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in values (see below)
npm run dev            # tsx watch on src/server.ts
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL
npm run dev            # Vite dev server (default http://localhost:5173)
```

### 3. Database
Apply the SQL files in `migrations/` in order against your MySQL database. Review migration `005` (index DDL is intentionally commented for DBA review) before applying in production.

---

## Environment Variables

**Backend (`backend/.env`)**

| Variable | Description |
| --- | --- |
| `PORT` | API server port |
| `NODE_ENV` | `development` / `production` |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL user |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |
| `DB_POOL_LIMIT` | Connection pool size (default 30) |
| `JWT_SECRET` | Secret for signing JWTs |
| `FRONTEND_URL` | Allowed CORS origin (default `http://localhost:5173`) |

**Frontend (`frontend/.env`)**

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend API |

> `validateEnv()` runs at startup and exits the process if required variables are missing or malformed.

---

## Available Scripts

**Backend**

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server with `tsx watch` |
| `npm run build` | Compile TypeScript (`tsc`) to `dist/` |
| `npm start` | Run compiled server (`node dist/server.js`) |

**Frontend**

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## API Overview

All protected routes require the auth cookie. Base paths are mounted in `app.ts`.

| Area | Base path | Examples |
| --- | --- | --- |
| Auth | `/auth` | `POST /login`, `POST /logout`, `GET /me`, `POST /users` |
| Customers (agent) | `/api/agent/customers` | `GET /`, `POST /`, `GET /summary-dashboard`, `GET /followups`, `GET /analytics`, `GET /drill-down`, `PATCH /:id/complete` |
| Users | `/api/users` | `GET /`, `PATCH /:id/status`, `GET/POST /:id/projects` |
| Projects | `/api/projects` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/assign`, `POST /:id/unassign` |
| Supervisor | `/api/supervisor` | `GET /summary-dashboard`, `GET /matrix`, `GET /follow-ups`, `GET /export`, `GET /drill-down`, `GET /customers/search`, `PUT /customers/:id/reassign`, `GET /whatsapp/audit` |
| WhatsApp | `/api/supervisor/whatsapp`, `/api/agent/whatsapp` | `GET/POST/PATCH/DELETE /templates`, `GET /template-preview`, `POST /send-manual`, `POST /log-message`, `GET /message-history/:customerId` |
| Health | `/healthz` | Load-balancer health check (no DB hit) |

---

## Data Model

Key entities (table structures inferred from queries; standalone schema not included in repo):

- **`users`** — role, self-referential `supervisor_id` hierarchy, `is_active`, credentials.
- **`projects`** — name, `created_by`, active flag.
- **`customers`** — name, contact (phone), location, pincode, profession, `project_id`.
- **`agent_customers`** *(the lead record / junction)* — `agent_id`, `customer_id`, `status_code`, `final_status`, follow-up date/time, `done_date`, budget, configuration, purpose, source, rating, remark, `is_active`, denormalized counters (`distinct_followup_dates`, `last_status_change_at`).
- **`agent_customer_logs`** — per-lead audit trail (`action_type`, `old_value`/`new_value` JSON).
- **`whatsapp_templates`** — `project_id`, `trigger_event`/`template_code`, body, `variables_json`, `is_active`.
- **`whatsapp_message_logs`** — agent/customer/project/template, send mode, delivery mode, recipient phone, status.

---

## Lead Pipeline

11 status codes:

`ringing` → `follow-up` → `visit-proposed` → `visit-confirmed` → `virtual-meet-confirmed` → `virtual-meet-done` → `visit-done` → `booking-done` · plus `sdow`, `not-reachable`, `lost`.

Closed/completed set = `{ visit-done, booking-done, virtual-meet-done }` → `final_status = COMPLETED`. Status updates, denormalized counters, and the audit-log insert are written inside a single transaction so state and history never diverge.

---

## Performance & Hardening

- **Sargable date filters** (`col >= ? AND col < DATE_ADD(?, INTERVAL 1 DAY)`) so MySQL can use indexes.
- **Denormalized counters** to avoid runtime JSON scans on hot dashboard queries.
- **Composite index DDL** prepared for the matrix/pipeline aggregations (migration 005).
- **gzip/brotli compression**, tuned **connection pooling**, slim SELECTs with safety limits.
- **Observability:** request-correlation IDs, structured request logging, global error handler.
- **Reliability:** env validation on boot, DB health check, `/healthz` endpoint, graceful SIGTERM/SIGINT shutdown with in-flight drain + pool close.
- **Frontend:** server-state caching, list virtualization, skeleton loaders, route-level error boundary.

---

## Roadmap

- Automated test suite (unit + integration).
- WhatsApp Business API integration for true automated delivery (currently deep-link/manual).
- Apply and verify composite indexes from migration 005 in production.
- Consolidated database schema/seed file checked into the repo.

---

*Built and maintained by [Aman Undre](https://github.com/aman0101-git).*
