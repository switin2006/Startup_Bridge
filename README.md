# StartupBridge

**A trust-mediated fundraising marketplace that connects startup founders with investors under admin oversight.**

**Live Demo:** [startup-bridge-frontend.onrender.com](https://startup-bridge-frontend.onrender.com/)

Founders publish funding pitches; investors browse and express interest; everyone interested in the same pitch enters a single **group-negotiation room** with the founder. The founder negotiates in the open, picks one winner in an atomic transaction, and an admin reviews and concludes the deal. Every account is gated, every role sees a different slice of the data, and money-moving actions are transactional so the system can never end up in an inconsistent state.

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [API Overview](#api-overview)
- [Security](#security)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Demo Accounts](#demo-accounts)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)

---

## Overview

StartupBridge is a full-stack web application with three roles — **Founder**, **Investor**, and **Admin** — built around a clear lifecycle state machine:

1. Users register and start as `pending`; an admin reviews their background note and approves them.
2. A founder's pitch moves through `draft → published → in_negotiation → closed` (or `withdrawn`).
3. Investors browse published pitches (summary cards only) and express interest, which seats them in that pitch's negotiation room.
4. The founder picks one winning investor; the deal is finalized as a single atomic transaction.
5. An admin concludes or fails the deal, closing the loop.

The interesting engineering is not the CRUD — it is the **state machine, the transactional integrity of the deal-closing step, and the role- and relationship-based access control**.

---

## Key Features

### Founder
- Create, edit, publish, and withdraw funding pitches (with PDF deck upload).
- View all investor interest on a pitch in one place.
- Negotiate with multiple investors in a shared room, then accept one winner with final terms.

### Investor
- Browse a feed of published pitches (summary cards only — full detail is gated).
- Express interest with a proposed amount, equity, and message.
- Join the pitch's negotiation room and chat with the founder.

### Admin
- Full user lifecycle management: approve, suspend, and delete users.
- Oversight of every negotiation, with read access to all messages.
- Conclude or fail deals; dashboard with live platform statistics.

### Platform
- **Group negotiation** — one shared room per pitch where investors compete.
- **Atomic deal closing** — picking a winner runs as a single database transaction.
- **In-app notifications** for every key event (interest received, accepted/denied, new message, deal concluded).
- **Polling-based chat** (5-second interval) for near-real-time negotiation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios, React Hook Form |
| Backend | Node.js, Express 4, Prisma ORM 5 |
| Database | PostgreSQL 16 |
| Authentication | JWT (HS256), bcryptjs |
| Security | Helmet, pinned CORS, express-rate-limit, Zod validation, magic-byte file checks |
| Infrastructure | Docker Compose, nginx |
| Testing | Vitest, Supertest |

---

## Architecture

```
                ┌──────────────────────────┐
                │   React SPA (Vite)        │
                │   JWT via Axios           │
                │   Polling for chat (5s)   │
                │   + notifications (30s)   │
                └───────────┬──────────────┘
                            │  HTTPS + Bearer JWT
                            ▼
                ┌──────────────────────────┐
                │   Express REST API        │
                │   helmet → CORS → JSON →  │
                │   rate-limit → route →    │
                │   requireAuth →           │
                │   requireApproved →       │
                │   requireRole → handler   │
                └───────────┬──────────────┘
                            │  Prisma ORM (parameterized)
                            ▼
                ┌──────────────────────────┐
                │   PostgreSQL 16           │
                └──────────────────────────┘

   Uploaded files are stored on disk and served only through an
   authenticated, permission-checked route (never statically).
```

**Request lifecycle:** every protected request passes through a layered middleware chain — `requireAuth` (verify JWT) → `requireApproved` (re-read account status from the DB) → `requireRole` (RBAC) — before reaching the handler.

---

## Data Model

Seven tables, each with enum-backed state machines and deliberate indexes.

| Table | Purpose |
|---|---|
| `User` | Accounts (admin / investor / startup) with `pending → approved → suspended` status gating. |
| `Pitch` | Funding listings with a `draft → published → in_negotiation → closed / withdrawn` lifecycle. |
| `Interest` | An investor's proposal and seat in a negotiation room (join table between investor, pitch, and room). |
| `Negotiation` | The group discussion room — **unique per pitch** (enforced at the database level). |
| `Message` | Chat messages within a room, indexed for efficient `since`-timestamp polling. |
| `Notification` | In-app alerts, one per recipient. |
| `File` | Metadata for uploaded pitch decks / proof-of-funds documents (bytes stored on disk). |

---

## API Overview

Eleven route groups, split by domain and role.

| Base Path | Responsibility |
|---|---|
| `/api/auth` | Register, login, current user (`/me`). |
| `/api/startup` | Founder dashboard, pitch CRUD, publish/withdraw, accept/deny interest. |
| `/api/pitches` | Shared pitch detail with role-based access control. |
| `/api/investor/pitches` | Investor feed and access-gated pitch detail. |
| `/api/investor/interests` | Express interest and list own interests. |
| `/api/interests` | Interest management (received, accept, deny). |
| `/api/negotiations` | Negotiation rooms (list and detail). |
| `/api/messages` | Polled chat messages (`?negotiationId=&since=`). |
| `/api/notifications` | List and mark in-app notifications read. |
| `/api/files` | Authenticated file upload and permission-checked download. |
| `/api/admin` | User lifecycle, negotiation oversight, platform stats. |

---

## Security

Security is a first-class concern in this project:

- **Authentication** — JWT (HS256, 7-day expiry) with bcrypt-hashed passwords (auto-salted, cost 10). Login returns the same generic error for wrong email and wrong password to avoid user enumeration.
- **Layered RBAC** — `requireAuth → requireApproved → requireRole`, applied in the correct order on every protected router.
- **Instant revocation** — `requireApproved` re-reads account status from the database on every request, so a suspended user is blocked immediately rather than waiting for their token to expire (closing the stateless-JWT revocation gap).
- **Relationship-based authorization (IDOR-safe)** — investors receive only summary card data until they express interest; full pitch detail and deck downloads unlock only when a valid `Interest` row exists, and lookups are scoped by a composite `(pitchId, investorId)` key so a user can never read another user's record by changing an ID.
- **Transactional integrity** — closing a deal (accept one investor, deny the rest, save final terms, update the pitch) executes as a single Prisma transaction — all-or-nothing.
- **Rate limiting** — a global limiter plus stricter per-route limits on login and registration to defend against brute-force attacks.
- **Pinned CORS** — the API refuses to start unless `FRONTEND_URL` is set, preventing an accidental allow-all-origins misconfiguration.
- **Hardened HTTP** — Helmet security headers; file downloads use a safe MIME allowlist, `Content-Disposition`, and `X-Content-Type-Options: nosniff` to prevent stored-XSS via uploads.
- **Input validation** — Zod schemas validate request bodies at trust boundaries.
- **File-upload safety** — magic-byte validation confirms an upload is genuinely a PDF, regardless of its extension.
- **Secret hygiene** — all secrets live in a git-ignored `.env`; only `.env.example` is committed.

---

## Getting Started

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) 20+ (only for local, non-Docker development)

### Option A — Run everything with Docker (recommended)

```bash
git clone https://github.com/havish-coder/Startup_Bridge.git
cd Startup_Bridge

# Create the backend env file and add a JWT secret
cp backend/.env.example backend/.env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the printed value into JWT_SECRET in backend/.env

docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:4000

The backend container applies database migrations automatically on start. Seed demo data with:

```bash
docker compose exec backend npm run seed
```

### Option B — Local development

```bash
# 1. Start only the database
docker compose up -d postgres

# 2. Backend
cd backend
npm install
cp .env.example .env          # paste a generated JWT_SECRET
npx prisma migrate deploy
npm run seed                  # loads demo accounts and pitches
npm run dev                   # http://localhost:4000

# 3. Frontend (in a new terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

### Verify it is running
- API health check: http://localhost:4000/api/health → returns `{"status":"ok"}`
- Frontend: http://localhost:5173 (local dev) or http://localhost:8080 (Docker)
- Database inspector: `cd backend && npx prisma studio` → http://localhost:5555

---

## Environment Variables

Configured in `backend/.env` (copy from `backend/.env.example`):

| Variable | Description |
|---|---|
| `JWT_SECRET` | **Required.** 32-byte hex secret for signing JWTs. Generate with the command above; never commit it. |
| `JWT_EXPIRY` | Token lifetime (default `7d`). |
| `DATABASE_URL` | PostgreSQL connection string (matches `docker-compose.yml` by default). |
| `FRONTEND_URL` | Allowed CORS origin. The server refuses to start if this is missing. |
| `PORT` | API port (default `4000`). |
| `ADMIN_CONTACT_PHONE` | Fallback contact number shown in the UI. |

The frontend reads `VITE_API_URL` from `frontend/.env` (see `frontend/.env.example`).

---

## Demo Accounts

After running the seed script, all demo accounts share the password **`Demo1234!`**:

| Role | Email | Status |
|---|---|---|
| Admin | `admin@demo.test` | Approved |
| Founder | `kavya@demo.test` | Approved |
| Founder | `nikhil@demo.test` | Approved |
| Founder | `meera@demo.test` | Pending — try approving it as the admin |
| Investor | `arjun@demo.test` | Approved |
| Investor | `priya@demo.test` | Approved |
| Investor | `ravi@demo.test` | Pending — try approving it as the admin |

---

## Testing

The backend has an automated test suite built on Vitest and Supertest:

```bash
cd backend
npm test
```

> The standalone scripts under `backend/tests/` are manual integration scripts (run with `node tests/<file>` against a live server) and are intentionally excluded from the automated Vitest run.

---

## Project Structure

```
.
├── docker-compose.yml          # Postgres + backend + frontend (nginx)
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       # 7 models, enums, indexes
│   │   ├── migrations/
│   │   └── seed.js
│   ├── test/                   # Vitest suite
│   └── src/
│       ├── app.js              # Express app factory (testable)
│       ├── server.js           # Boot + env validation
│       ├── middleware/         # requireAuth, requireApproved, requireRole, errorHandler
│       ├── routes/             # 11 route groups
│       └── lib/                # notify, upload, validate helpers
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── api.js              # Axios instance + JWT interceptor
        ├── context/            # AuthContext
        ├── components/         # Layout, Sidebar, NotificationBell, ChatBox, ...
        └── pages/              # public, investor, startup, admin, shared
```

---

## Roadmap

Planned improvements, in rough priority order:

- Replace 5-second polling with WebSockets for true real-time chat.
- Move JWTs from `localStorage` to httpOnly cookies, with refresh tokens.
- Move file storage from local disk to object storage (S3 / R2).
- Harden the negotiation-room creation against a concurrent-interest race condition.
- Expand automated test coverage across all mutating routes.
