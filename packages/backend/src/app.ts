import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { securityPlugin } from './plugins/security.js';
import { authPlugin } from './plugins/auth.js';
import { databasePlugin } from './plugins/database.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { blockchainPlugin } from './plugins/blockchain.js';
import { redisCachePlugin } from './plugins/redis.js';
import { authRoutes } from './modules/auth/routes.js';
import { accountRoutes } from './modules/accounts/routes.js';
import { journalRoutes } from './modules/journal/routes.js';
import { workflowRoutes } from './modules/workflow/routes.js';
import { reportRoutes } from './modules/reports/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
import { cosoRoutes } from './modules/coso/routes.js';
import { piecesRoutes } from './modules/pieces/routes.js';
import { fiscalPeriodRoutes } from './modules/fiscal-periods/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { generalLedgerRoutes } from './modules/general-ledger/routes.js';
import { customerRoutes } from './modules/customers/routes.js';
import { vendorRoutes } from './modules/vendors/routes.js';
import { invoiceRoutes } from './modules/invoices/routes.js';
import { paymentRoutes } from './modules/payments/routes.js';
import { budgetRoutes } from './modules/budget/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { blockchainRoutes } from './modules/blockchain/routes.js';
import { rolesRoutes } from './modules/roles/routes.js';
import { taxRoutes } from './modules/tax/routes.js';
import { inventoryRoutes } from './modules/inventory/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const startTime = Date.now();

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  // Security headers
  await app.register(securityPlugin);

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(errorHandlerPlugin);
  await app.register(databasePlugin);
  await app.register(redisCachePlugin);
  await app.register(authPlugin);
  await app.register(blockchainPlugin);

  // Liveness check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }));

  // Readiness check — verifies database and blockchain connectivity
  app.get('/health/ready', async () => {
    const checks: Record<string, { status: string; latency?: number }> = {};

    // Database check
    const dbStart = Date.now();
    try {
      await app.pgPool.query('SELECT 1');
      checks.database = { status: 'ok', latency: Date.now() - dbStart };
    } catch {
      checks.database = { status: 'error', latency: Date.now() - dbStart };
    }

    // Blockchain check
    try {
      const bcStatus = app.blockchain.getStatus();
      checks.blockchain = { status: bcStatus.connected ? 'ok' : 'degraded' };
    } catch {
      checks.blockchain = { status: 'error' };
    }

    // Redis check
    try {
      const redisStart = Date.now();
      await app.redis.ping();
      checks.redis = { status: 'ok', latency: Date.now() - redisStart };
    } catch {
      checks.redis = { status: 'unavailable' };
    }

    const allOk = checks.database.status === 'ok';
    return {
      status: allOk ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };
  });

  // API routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(accountRoutes, { prefix: '/api/accounts' });
  await app.register(journalRoutes, { prefix: '/api/journal-entries' });
  await app.register(workflowRoutes, { prefix: '/api/workflows' });
  await app.register(reportRoutes, { prefix: '/api/reports' });
  await app.register(auditRoutes, { prefix: '/api/audit' });
  await app.register(cosoRoutes, { prefix: '/api/coso' });
  await app.register(piecesRoutes, { prefix: '/api/pieces' });
  await app.register(fiscalPeriodRoutes, { prefix: '/api/fiscal-periods' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
  await app.register(generalLedgerRoutes, { prefix: '/api/general-ledger' });
  await app.register(customerRoutes, { prefix: '/api/customers' });
  await app.register(vendorRoutes, { prefix: '/api/vendors' });
  await app.register(invoiceRoutes, { prefix: '/api/invoices' });
  await app.register(paymentRoutes, { prefix: '/api/payments' });
  await app.register(budgetRoutes, { prefix: '/api/budget' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(blockchainRoutes, { prefix: '/api/blockchain' });
  await app.register(rolesRoutes, { prefix: '/api/roles' });
  await app.register(taxRoutes, { prefix: '/api/tax-rates' });
  await app.register(inventoryRoutes, { prefix: '/api/inventory' });

  // Serve frontend static files in production
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ error: 'Not Found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
