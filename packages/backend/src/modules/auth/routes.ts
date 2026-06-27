import type { FastifyInstance } from 'fastify';
import { AuthService } from './service.js';
import { loginSchema, createUserSchema } from '@bais/shared';
import { Permission } from '@bais/shared';
import { requirePermission } from '../../plugins/auth.js';

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const tokens = await authService.login(body.email, body.password);
    return reply.send(tokens);
  });

  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    const tokens = await authService.refresh(refreshToken);
    return reply.send(tokens);
  });

  app.post('/logout', {
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    await authService.logout(refreshToken);
    return reply.status(204).send();
  });

  app.get('/me', {
    preHandler: [app.authenticate],
  }, async (request) => {
    return authService.getProfile(request.user.sub);
  });

  // User management (Admin only)
  app.get('/users', {
    preHandler: [app.authenticate, requirePermission(Permission.USERS_MANAGE)],
  }, async (request) => {
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    return authService.listUsers(page, limit);
  });

  app.post('/users', {
    preHandler: [app.authenticate, requirePermission(Permission.USERS_MANAGE)],
  }, async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const user = await authService.createUser(body);
    return reply.status(201).send(user);
  });
}
