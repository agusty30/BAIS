import { LedgerContract } from './contracts/ledger-contract.js';
import { ApprovalContract } from './contracts/approval-contract.js';
import { AuditContract } from './contracts/audit-contract.js';

export const contracts = [LedgerContract, ApprovalContract, AuditContract];
export { LedgerContract, ApprovalContract, AuditContract };
