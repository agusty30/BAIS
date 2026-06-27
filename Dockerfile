FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json turbo.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/backend/ ./packages/backend/
COPY packages/frontend/ ./packages/frontend/

# Build shared first, then backend and frontend
RUN pnpm --filter @bais/shared run build
RUN pnpm --filter @bais/backend run build
RUN pnpm --filter @bais/frontend run build

# Production image
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile

COPY --from=base /app/packages/shared/ ./packages/shared/
COPY --from=base /app/packages/backend/dist/ ./packages/backend/dist/
COPY --from=base /app/packages/backend/drizzle.config.ts ./packages/backend/
COPY --from=base /app/packages/backend/src/db/migrations/ ./packages/backend/src/db/migrations/
COPY --from=base /app/packages/frontend/dist/ ./packages/frontend/dist/
COPY entrypoint.sh ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "entrypoint.sh"]
