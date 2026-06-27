import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../db/schema.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle<typeof schema>>;
    pgPool: pg.Pool;
  }
}

async function database(app: FastifyInstance) {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
  });

  const db = drizzle(pool, { schema });

  app.decorate('db', db);
  app.decorate('pgPool', pool);

  app.addHook('onClose', async () => {
    await pool.end();
  });
}

export const databasePlugin = fp(database, { name: 'database' });
