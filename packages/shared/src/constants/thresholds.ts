import { Role } from '../types/auth.js';

export interface ApprovalThreshold {
  minAmount: number;
  maxAmount: number | null;
  requiredApprovals: number;
  approverRoles: Role[];
  escalationTimeoutHours: number;
}

export const APPROVAL_THRESHOLDS: ApprovalThreshold[] = [
  {
    minAmount: 0,
    maxAmount: 100_000_00, // $1,000.00 in cents
    requiredApprovals: 1,
    approverRoles: [Role.MANAGER],
    escalationTimeoutHours: 24,
  },
  {
    minAmount: 100_000_00,
    maxAmount: 1_000_000_00, // $10,000.00 in cents
    requiredApprovals: 2,
    approverRoles: [Role.MANAGER, Role.ADMIN],
    escalationTimeoutHours: 48,
  },
  {
    minAmount: 1_000_000_00,
    maxAmount: null, // unlimited
    requiredApprovals: 3,
    approverRoles: [Role.MANAGER, Role.ADMIN],
    escalationTimeoutHours: 72,
  },
];

export function getThresholdForAmount(amountCents: number): ApprovalThreshold {
  const threshold = APPROVAL_THRESHOLDS.find(
    (t) => amountCents >= t.minAmount && (t.maxAmount === null || amountCents < t.maxAmount),
  );
  return threshold ?? APPROVAL_THRESHOLDS[APPROVAL_THRESHOLDS.length - 1];
}
