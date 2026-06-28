import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { v4 as uuid } from 'uuid';
import { users, refreshTokens } from '../../db/schema.js';
import { UnauthorizedError, NotFoundError, ConflictError } from '../../plugins/error-handler.js';
import { ROLE_PERMISSIONS, type Role } from '@bais/shared';

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async login(email: string, password: string) {
    const [user] = await this.app.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const validPassword = await verify(user.passwordHash, password);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return this.generateTokens(user);
  }

  async refresh(token: string) {
    const [stored] = await this.app.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Rotate: delete old token
    await this.app.db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

    const [user] = await this.app.db
      .select()
      .from(users)
      .where(eq(users.id, stored.userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User inactive');
    }

    return this.generateTokens(user);
  }

  async logout(token: string) {
    await this.app.db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async getProfile(userId: string) {
    const [user] = await this.app.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundError('User');

    return {
      ...user,
      permissions: ROLE_PERMISSIONS[user.role as Role] || [],
    };
  }

  async updateProfile(userId: string, data: { fullName: string }) {
    const [user] = await this.app.db
      .update(users)
      .set({ fullName: data.fullName, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      });

    if (!user) throw new NotFoundError('User');
    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await this.app.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new NotFoundError('User');

    const valid = await verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const passwordHash = await hash(newPassword);
    await this.app.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async listUsers(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const results = await this.app.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .limit(limit)
      .offset(offset);

    return { data: results, page, limit };
  }

  async createUser(input: { email: string; password: string; fullName: string; role: string }) {
    const existing = await this.app.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await hash(input.password);
    const [user] = await this.app.db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role as any,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        createdAt: users.createdAt,
      });

    return user;
  }

  private async generateTokens(user: { id: string; email: string; role: string }) {
    const accessToken = this.app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    });

    const refreshToken = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.app.db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}
