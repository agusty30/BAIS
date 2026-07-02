import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fjwt from '@fastify/jwt';
import { eq } from 'drizzle-orm';
import { Permission, Role, ROLE_PERMISSIONS } from '@bais/shared';
import { roles } from '../db/schema.js';
import { ForbiddenError, UnauthorizedError } from './error-handler.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      role: Role;
    };
    user: {
      sub: string;
      email: string;
      role: Role;
      permissions: Permission[];
    };
  }
}

async function auth(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-in-prod');
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  await app.register(fjwt, {
    secret,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const payload = await request.jwtVerify() as { sub: string; email: string; role: Role };
      let permissions: Permission[];
      if (payload.role === 'admin') {
        permissions = Object.values(Permission);
      } else {
        try {
          const [dbRole] = await app.db.select().from(roles).where(eq(roles.name, payload.role)).limit(1);
          permissions = dbRole ? (dbRole.permissions as Permission[]) : (ROLE_PERMISSIONS[payload.role] || []);
        } catch {
          permissions = ROLE_PERMISSIONS[payload.role] || [];
        }
      }
      request.user = { ...payload, permissions };
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });
}

export function requirePermission(...permissions: Permission[]) {
  return async (request: FastifyRequest) => {
    if (!request.user) {
      throw new UnauthorizedError();
    }
    const hasAll = permissions.every((p) => request.user.permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

export const authPlugin = fp(auth, {
  name: 'auth',
  dependencies: ['error-handler'],
});
