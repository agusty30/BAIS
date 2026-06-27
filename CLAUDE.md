# BAIS - Blockchain-based Accounting Information System

## Quick Start

```bash
# Install pnpm (if not available)
npm install -g pnpm@9

# Install dependencies
pnpm install

# Start dev services (PostgreSQL, Redis)
docker compose up -d

# Run database migrations
make db-migrate

# Seed development data
make db-seed

# Start all dev servers
make dev
```

## Development

- Backend: http://localhost:3000 (Fastify API)
- Frontend: http://localhost:5173 (Vite dev server)
- Adminer: http://localhost:8080 (Database GUI)
- Blockchain: Mock mode by default (set `BLOCKCHAIN_MODE=fabric` for real Fabric)

## Demo Credentials

- Admin: admin@bais.local / admin123!@#
- Accountant: accountant@bais.local / password123!
- Manager: manager@bais.local / password123!
- Auditor: auditor@bais.local / password123!

## Project Structure

```
packages/
  shared/     - Types, validation schemas, constants
  backend/    - Fastify REST API + PostgreSQL + Blockchain gateway
  frontend/   - React + Vite + TanStack Query
  chaincode/  - Hyperledger Fabric smart contracts
```

## Key Commands

```bash
make dev           # Start everything (services + servers)
make dev-services  # Start Docker services only
make test          # Run all tests
make typecheck     # TypeScript type checking
make db-reset      # Reset database (drop + migrate + seed)
```

## Architecture Notes

- All monetary values stored as integers (cents)
- Blockchain mock gateway uses in-memory Map (same interface as Fabric)
- Backend uses module pattern: routes → service → repository/blockchain
- Frontend uses TanStack Query for server state, Zustand for client state
- RBAC enforced at both route level and service level
