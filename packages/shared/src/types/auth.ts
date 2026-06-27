export enum Role {
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  MANAGER = 'manager',
  AUDITOR = 'auditor',
  VIEWER = 'viewer',
}

export enum Permission {
  // Accounts
  ACCOUNTS_CREATE = 'accounts:create',
  ACCOUNTS_READ = 'accounts:read',
  ACCOUNTS_UPDATE = 'accounts:update',
  ACCOUNTS_DELETE = 'accounts:delete',

  // Journal Entries
  JOURNAL_CREATE = 'journal:create',
  JOURNAL_READ = 'journal:read',
  JOURNAL_UPDATE = 'journal:update',
  JOURNAL_SUBMIT = 'journal:submit',
  JOURNAL_POST = 'journal:post',
  JOURNAL_VOID = 'journal:void',

  // Approvals
  APPROVAL_VIEW = 'approval:view',
  APPROVAL_DECIDE = 'approval:decide',

  // Reports
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',

  // Audit
  AUDIT_VIEW = 'audit:view',
  AUDIT_VERIFY = 'audit:verify',

  // Admin
  USERS_MANAGE = 'users:manage',
  ROLES_MANAGE = 'roles:manage',
  PERIODS_MANAGE = 'periods:manage',
  WORKFLOWS_MANAGE = 'workflows:manage',

  // COSO & PIECES
  COSO_VIEW = 'coso:view',
  COSO_EVALUATE = 'coso:evaluate',
  PIECES_VIEW = 'pieces:view',
  PIECES_MANAGE = 'pieces:manage',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}
