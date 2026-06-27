import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { authPlugin } from './plugins/auth.js';
import { databasePlugin } from './plugins/database.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { blockchainPlugin } from './plugins/blockchain.js';
import { authRoutes } from './modules/auth/routes.js';
import { accountRoutes } from './modules/accounts/routes.js';
import { journalRoutes } from './modules/journal/routes.js';
import { workflowRoutes } from './modules/workflow/routes.js';
import { reportRoutes } from './modules/reports/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
import { cosoRoutes } from './modules/coso/routes.js';
import { piecesRoutes } from './modules/pieces/routes.js';
import { fiscalPeriodRoutes } from './modules/fiscal-periods/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

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
  await app.register(authPlugin);
  await app.register(blockchainPlugin);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

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
