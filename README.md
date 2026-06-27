# BAIS - Blockchain-based Accounting Information System

A full-stack enterprise accounting system that integrates **Hyperledger Fabric blockchain** technology with traditional double-entry bookkeeping. Built for academic research and enterprise use, featuring **COSO Internal Control Framework** evaluation and **PIECES Analysis Framework** for information system assessment.

> **Live Demo:** [https://bais-production.up.railway.app](https://bais-production.up.railway.app)

## Features

### Core Accounting
- **Double-Entry Bookkeeping** — Every transaction requires balanced debit and credit entries, enforced at both frontend and backend
- **Chart of Accounts** — Hierarchical account tree with 5 types: Asset, Liability, Equity, Revenue, Expense
- **Journal Entries** — Full lifecycle management: Draft → Submit → Approve → Post
- **Financial Reports** — Trial Balance, Income Statement, Balance Sheet with period filtering
- **Fiscal Period Management** — Period-based accounting with open/closed/locked states

### Blockchain Integration
- **Immutable Audit Trail** — Every posted transaction is recorded on the blockchain
- **Data Integrity Verification** — Cross-check PostgreSQL records against blockchain state
- **Mock Gateway** — In-memory blockchain mock with the same interface as Hyperledger Fabric for development
- **Fabric-Ready** — Switch to real Hyperledger Fabric network via environment variable

### Approval Workflows
- **Threshold-Based Routing** — Transactions automatically routed based on amount thresholds
- **Multi-Level Approval** — Configurable approval chains with role requirements
- **Segregation of Duties** — Entry creator cannot approve their own transactions
- **Approve/Reject with Comments** — Full audit trail of approval decisions

### COSO Internal Control Framework
- **5 Component Evaluation** — Control Environment, Risk Assessment, Control Activities, Information & Communication, Monitoring
- **Maturity Scoring** — 1-5 scale (Initial → Optimized) per component
- **Evidence Checklists** — System controls with implemented/effectiveness assessment
- **Period-Based Tracking** — Historical evaluation data for trend analysis

### PIECES Analysis Framework
- **6 Dimension Assessment** — Performance, Information, Economics, Control, Efficiency, Service
- **Metric Recording** — Quantitative KPI tracking per dimension with defined units
- **Score Calculation** — Automated scoring (0-100%) with trend indicators
- **Predefined Metrics** — 18 KPI definitions across all dimensions (3 per dimension)

### Security & Audit
- **Role-Based Access Control (RBAC)** — 4 roles: Admin, Accountant, Manager, Auditor
- **JWT Authentication** — Access tokens (15 min) + refresh tokens with secure rotation
- **Complete Audit Logging** — Every action logged with user, timestamp, IP, and details
- **Rate Limiting** — API request throttling to prevent abuse

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 6, TanStack Query v5, Zustand v5, Tailwind CSS 3.4 |
| **Backend** | Fastify 5, TypeScript, Node.js 20+ |
| **Database** | PostgreSQL 16, Drizzle ORM 0.45 |
| **Blockchain** | Hyperledger Fabric (mock gateway included) |
| **Shared** | Zod validation schemas, TypeScript types, constants |
| **Build** | pnpm workspaces, Turborepo |
| **Deployment** | Docker, Railway |

## Project Structure

```
bais/
├── packages/
│   ├── shared/          # Types, validation schemas, constants
│   │   └── src/
│   │       ├── types/          # TypeScript interfaces (accounting, auth, COSO, PIECES)
│   │       ├── constants/      # Chart of accounts, roles, thresholds
│   │       └── validation/     # Zod schemas for API payloads
│   │
│   ├── backend/         # Fastify REST API
│   │   └── src/
│   │       ├── db/             # Drizzle schema, migrations, seed
│   │       ├── modules/        # Route handlers organized by domain
│   │       │   ├── auth/       # Login, register, token refresh
│   │       │   ├── accounts/   # Chart of accounts CRUD
│   │       │   ├── journal/    # Journal entries lifecycle
│   │       │   ├── workflow/   # Approval workflows
│   │       │   ├── reports/    # Financial statements
│   │       │   ├── audit/      # Audit log queries
│   │       │   ├── coso/       # COSO evaluations
│   │       │   ├── pieces/     # PIECES metrics
│   │       │   └── fiscal-periods/
│   │       ├── plugins/        # Fastify plugins (auth, db, blockchain, errors)
│   │       └── blockchain/     # Mock + Fabric gateway implementations
│   │
│   ├── frontend/        # React SPA
│   │   └── src/
│   │       ├── pages/          # Route pages (Dashboard, Accounts, Journal, etc.)
│   │       ├── components/     # Shared layout components
│   │       ├── stores/         # Zustand auth store
│   │       └── api/            # Axios client with JWT interceptors
│   │
│   └── chaincode/       # Hyperledger Fabric smart contracts
│       └── src/contracts/      # Ledger, Approval, Audit contracts
│
├── Dockerfile           # Multi-stage production build
├── docker-compose.yml   # Dev services (PostgreSQL, Redis, Adminer)
├── railway.toml         # Railway deployment config
└── Makefile             # Development commands
```

## Database Schema

13 tables with full referential integrity:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles and bcrypt password hashes |
| `accounts` | Chart of accounts with parent-child hierarchy |
| `fiscal_periods` | Accounting periods (year/quarter) |
| `journal_entries` | Transaction headers with status lifecycle |
| `journal_entry_lines` | Debit/credit lines linked to accounts |
| `account_balances` | Materialized running totals per account per period |
| `approval_workflows` | Multi-step approval chains |
| `approval_steps` | Individual approval/rejection decisions |
| `workflow_templates` | Amount-based approval routing rules |
| `audit_logs` | Complete audit trail with blockchain references |
| `coso_evaluations` | COSO component maturity assessments |
| `pieces_metrics` | PIECES KPI measurements |
| `notifications` | User notification queue |
| `refresh_tokens` | JWT refresh token storage |

All monetary values are stored as **integers (cents)** to avoid floating-point precision issues.

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/register` | Register new user (admin only) |
| `POST` | `/api/auth/refresh` | Refresh access token |

### Accounts
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/accounts` | List accounts (flat or tree) |
| `GET` | `/api/accounts/tree` | Hierarchical account tree |
| `POST` | `/api/accounts` | Create new account |
| `PATCH` | `/api/accounts/:id` | Update account |

### Journal Entries
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/journal-entries` | List entries with filters |
| `GET` | `/api/journal-entries/:id` | Get entry with lines |
| `POST` | `/api/journal-entries` | Create draft entry |
| `POST` | `/api/journal-entries/:id/submit` | Submit for approval |
| `POST` | `/api/journal-entries/:id/post` | Post approved entry to ledger |

### Workflows
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workflows/pending` | List pending approvals |
| `POST` | `/api/workflows/:id/approve` | Approve a workflow step |
| `POST` | `/api/workflows/:id/reject` | Reject with comments |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/reports/trial-balance` | Trial balance for period |
| `GET` | `/api/reports/income-statement` | Income statement for period |
| `GET` | `/api/reports/balance-sheet` | Balance sheet for period |
| `GET` | `/api/reports/verify` | Blockchain integrity check |

### COSO & PIECES
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/coso/matrix` | Current COSO maturity matrix |
| `POST` | `/api/coso/evaluations` | Submit component evaluation |
| `GET` | `/api/pieces/dashboard` | PIECES scores dashboard |
| `POST` | `/api/pieces/metrics` | Record a dimension metric |

### Audit
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/audit/logs` | Query audit trail |
| `GET` | `/api/audit/integrity-check` | Blockchain integrity verification |

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Setup

```bash
# Clone the repository
git clone https://github.com/agusty30/BAIS.git
cd BAIS

# Install dependencies
pnpm install

# Start dev services (PostgreSQL, Redis)
docker compose up -d

# Run database migrations
make db-migrate

# Seed demo data
make db-seed

# Start all dev servers
make dev
```

### Access
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Adminer (DB GUI):** http://localhost:8080

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bais.local | admin123!@# |
| Accountant | accountant@bais.local | password123! |
| Manager | manager@bais.local | password123! |
| Auditor | auditor@bais.local | password123! |

## Deployment (Railway)

The application is configured for one-click Railway deployment:

1. **PostgreSQL** — Provisioned as a Railway database service
2. **BAIS App** — Single Docker container serving both API and frontend

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (auto-linked from Railway Postgres) |
| `JWT_SECRET` | Secret key for JWT signing (generate with `openssl rand -base64 32`) |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Railway default) |
| `BLOCKCHAIN_MODE` | `mock` (or `fabric` for real Hyperledger network) |
| `CORS_ORIGIN` | `*` (or specific domain) |

### Deploy Steps

```bash
# Install Railway CLI
curl -fsSL https://railway.com/install.sh | sh

# Login and link project
railway login
railway init --name bais

# Add PostgreSQL
railway add --database postgres

# Set environment variables
railway variables --set "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
railway variables --set "JWT_SECRET=$(openssl rand -base64 32)"
railway variables --set "NODE_ENV=production"
railway variables --set "BLOCKCHAIN_MODE=mock"
railway variables --set "PORT=3000"

# Deploy
railway up
```

## Architecture

### Backend Module Pattern

Each feature follows a consistent pattern:

```
routes.ts → service logic → repository (Drizzle ORM) → PostgreSQL
                          → blockchain gateway → Hyperledger Fabric / Mock
                          → audit logger → audit_logs table
```

### Frontend Data Flow

```
React Component → useQuery/useMutation (TanStack Query)
               → Axios client (with JWT interceptor)
               → Backend API
               → Cache invalidation on mutations
```

### Blockchain Integration

```
Journal Entry Posted
  → Hash entry data (description, lines, amounts)
  → Submit to blockchain gateway
  → Store transaction ID in journal_entries.blockchain_tx_id
  → Log in audit_logs with blockchain reference

Integrity Check
  → Fetch all posted entries from PostgreSQL
  → For each: re-hash and compare with blockchain record
  → Report mismatches
```

### Approval Workflow

```
Entry Created (draft)
  → Submit → Check amount against workflow templates
  → Create workflow with appropriate number of steps
  → Route to approvers by required role
  → Each step: approve → next step / reject → workflow rejected
  → All steps approved → entry status = approved
  → Post → record on blockchain → entry status = posted
```

## Key Commands

```bash
make dev           # Start everything (Docker services + dev servers)
make dev-services  # Start Docker services only (PostgreSQL, Redis)
make test          # Run all tests
make typecheck     # TypeScript type checking
make db-migrate    # Run Drizzle migrations
make db-seed       # Seed demo data
make db-reset      # Drop + migrate + seed
```

## License

MIT
