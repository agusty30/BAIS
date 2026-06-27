export enum WorkflowStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum ApprovalStepStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

export interface ApprovalStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  approverId: string | null;
  requiredRole: string;
  status: ApprovalStepStatus;
  comments: string | null;
  decidedAt: Date | null;
  blockchainTxId: string | null;
}

export interface ApprovalWorkflow {
  id: string;
  journalEntryId: string;
  status: WorkflowStatus;
  currentStep: number;
  totalSteps: number;
  initiatedById: string;
  blockchainTxId: string | null;
  steps: ApprovalStep[];
  createdAt: Date;
  completedAt: Date | null;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number | null;
  steps: WorkflowTemplateStep[];
  isActive: boolean;
}

export interface WorkflowTemplateStep {
  stepOrder: number;
  requiredRole: string;
  escalationTimeoutHours: number;
}

export interface ApprovalDecisionInput {
  decision: 'approve' | 'reject' | 'return';
  comments?: string;
}
