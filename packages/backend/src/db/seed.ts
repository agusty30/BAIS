import { config } from 'dotenv';
config();

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import * as schema from './schema.js';
import { DEFAULT_CHART_OF_ACCOUNTS } from '@bais/shared';

async function seed() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Seeding database...');

  // Create admin user (upsert to rehash password on algorithm change)
  const adminHash = await hash('admin123!@#');
  await db.insert(schema.users).values({
    email: 'admin@bais.local',
    passwordHash: adminHash,
    fullName: 'System Administrator',
    role: 'admin',
  }).onConflictDoUpdate({
    target: schema.users.email,
    set: { passwordHash: adminHash },
  });

  // Create sample users
  const sampleUsers = [
    { email: 'accountant@bais.local', fullName: 'Jane Accountant', role: 'accountant' as const },
    { email: 'manager@bais.local', fullName: 'Bob Manager', role: 'manager' as const },
    { email: 'auditor@bais.local', fullName: 'Carol Auditor', role: 'auditor' as const },
  ];

  const userHash = await hash('password123!');
  for (const user of sampleUsers) {
    await db.insert(schema.users).values({
      ...user,
      passwordHash: userHash,
    }).onConflictDoUpdate({
      target: schema.users.email,
      set: { passwordHash: userHash },
    });
  }

  // Create fiscal period (check if exists first)
  const existingPeriods = await db.select({ id: schema.fiscalPeriods.id })
    .from(schema.fiscalPeriods)
    .where(eq(schema.fiscalPeriods.name, 'FY 2026 - Q1'))
    .limit(1);

  if (existingPeriods.length === 0) {
    await db.insert(schema.fiscalPeriods).values({
      name: 'FY 2026 - Q1',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      status: 'open',
      year: 2026,
    });
  }

  // Seed Chart of Accounts
  async function insertAccounts(accounts: typeof DEFAULT_CHART_OF_ACCOUNTS, parentId: string | null = null, level = 0) {
    for (const account of accounts) {
      const normalBalance = ['asset', 'expense'].includes(account.type) ? 'debit' : 'credit';
      await db.insert(schema.accounts).values({
        code: account.code,
        name: account.name,
        type: account.type as any,
        normalBalance: normalBalance as any,
        parentId,
        level,
        path: account.code,
      }).onConflictDoNothing({ target: schema.accounts.code });

      if (account.children) {
        const [inserted] = await db.select({ id: schema.accounts.id })
          .from(schema.accounts)
          .where(eq(schema.accounts.code, account.code))
          .limit(1);
        if (inserted) {
          await insertAccounts(account.children as any, inserted.id, level + 1);
        }
      }
    }
  }

  await insertAccounts(DEFAULT_CHART_OF_ACCOUNTS);

  // Create default workflow templates (check if any exist first)
  const existingTemplates = await db.select({ id: schema.workflowTemplates.id })
    .from(schema.workflowTemplates)
    .limit(1);

  if (existingTemplates.length === 0) {
    await db.insert(schema.workflowTemplates).values([
      {
        name: 'Standard Approval (< $1,000)',
        minAmount: 0,
        maxAmount: 100_000,
        steps: [{ stepOrder: 1, requiredRole: 'manager', escalationTimeoutHours: 24 }],
      },
      {
        name: 'Dual Approval ($1,000 - $10,000)',
        minAmount: 100_000,
        maxAmount: 1_000_000,
        steps: [
          { stepOrder: 1, requiredRole: 'manager', escalationTimeoutHours: 24 },
          { stepOrder: 2, requiredRole: 'admin', escalationTimeoutHours: 48 },
        ],
      },
      {
        name: 'Triple Approval (> $10,000)',
        minAmount: 1_000_000,
        maxAmount: null,
        steps: [
          { stepOrder: 1, requiredRole: 'manager', escalationTimeoutHours: 24 },
          { stepOrder: 2, requiredRole: 'admin', escalationTimeoutHours: 48 },
          { stepOrder: 3, requiredRole: 'admin', escalationTimeoutHours: 72 },
        ],
      },
    ]);
  }

  console.log('Seed complete!');
  await pool.end();
}

seed().catch(console.error);
