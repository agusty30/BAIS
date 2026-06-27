import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fjwt from '@fastify/jwt';
import { Permission, Role, ROLE_PERMISSIONS } from '@bais/shared';
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
  await app.register(fjwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      const payload = await request.jwtVerify() as { sub: string; email: string; role: Role };
      const permissions = ROLE_PERMISSIONS[payload.role] || [];
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
