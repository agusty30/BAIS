import { config } from 'dotenv';
config();

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import * as schema from './schema.js';
import { DEFAULT_CHART_OF_ACCOUNTS, ROLE_PERMISSIONS, Permission } from '@bais/shared';

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

  // Create fiscal periods (Q1-Q4 for 2025 and 2026)
  const quarters = [
    { q: 1, start: '01-01', end: '03-31' },
    { q: 2, start: '04-01', end: '06-30' },
    { q: 3, start: '07-01', end: '09-30' },
    { q: 4, start: '10-01', end: '12-31' },
  ];

  for (const year of [2025, 2026]) {
    for (const { q, start, end } of quarters) {
      const periodName = `FY ${year} - Q${q}`;
      const [existing] = await db.select({ id: schema.fiscalPeriods.id })
        .from(schema.fiscalPeriods)
        .where(eq(schema.fiscalPeriods.name, periodName))
        .limit(1);
      if (!existing) {
        await db.insert(schema.fiscalPeriods).values({
          name: periodName,
          startDate: new Date(`${year}-${start}`),
          endDate: new Date(`${year}-${end}`),
          status: year < 2026 ? 'closed' : 'open',
          year,
        });
      }
    }
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

  // Seed default roles from ROLE_PERMISSIONS constant
  const roleDescriptions: Record<string, string> = {
    admin: 'Full system access',
    accountant: 'Manage accounts, journal entries, and financial operations',
    manager: 'Approve transactions and manage budgets',
    auditor: 'View and verify all financial records',
    viewer: 'Read-only access to financial data',
  };
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    await db.insert(schema.roles).values({
      name: roleName,
      description: roleDescriptions[roleName] || '',
      permissions: permissions as string[],
      isSystem: true,
    }).onConflictDoNothing({ target: schema.roles.name });
  }

  // Seed default Indonesian tax rates
  const defaultTaxRates = [
    { name: 'PPN (Pajak Pertambahan Nilai)', code: 'PPN', rate: 1100, type: 'vat' as const, description: 'Indonesian Value Added Tax - 11%' },
    { name: 'PPh 21 (Pajak Penghasilan Pasal 21)', code: 'PPH21', rate: 500, type: 'income' as const, description: 'Income tax on employment - 5% (lowest bracket)' },
    { name: 'PPh 22 (Pajak Penghasilan Pasal 22)', code: 'PPH22', rate: 150, type: 'withholding' as const, description: 'Import/purchase withholding tax - 1.5%' },
    { name: 'PPh 23 (Pajak Penghasilan Pasal 23)', code: 'PPH23', rate: 200, type: 'withholding' as const, description: 'Service withholding tax - 2%' },
    { name: 'PPh 25 (Pajak Penghasilan Pasal 25)', code: 'PPH25', rate: 2500, type: 'income' as const, description: 'Corporate income tax installment - 25%' },
    { name: 'PPh 4(2) Final', code: 'PPH4-2', rate: 1000, type: 'withholding' as const, description: 'Final income tax - 10% (rental income)' },
  ];
  for (const tax of defaultTaxRates) {
    await db.insert(schema.taxRates).values(tax).onConflictDoNothing({ target: schema.taxRates.code });
  }

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
