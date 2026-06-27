export enum COSOComponent {
  CONTROL_ENVIRONMENT = 'control_environment',
  RISK_ASSESSMENT = 'risk_assessment',
  CONTROL_ACTIVITIES = 'control_activities',
  INFORMATION_COMMUNICATION = 'information_communication',
  MONITORING = 'monitoring',
}

export interface COSOEvaluation {
  id: string;
  component: COSOComponent;
  score: number; // 1-5 maturity level
  evidence: COSOEvidence[];
  evaluatedById: string;
  periodId: string;
  createdAt: Date;
}

export interface COSOEvidence {
  control: string;
  description: string;
  implemented: boolean;
  effectiveness: 'effective' | 'partially_effective' | 'ineffective';
}

export interface COSOMatrix {
  components: {
    component: COSOComponent;
    label: string;
    currentScore: number;
    previousScore: number | null;
    controls: COSOEvidence[];
  }[];
  overallScore: number;
}

export const COSO_COMPONENT_LABELS: Record<COSOComponent, string> = {
  [COSOComponent.CONTROL_ENVIRONMENT]: 'Control Environment',
  [COSOComponent.RISK_ASSESSMENT]: 'Risk Assessment',
  [COSOComponent.CONTROL_ACTIVITIES]: 'Control Activities',
  [COSOComponent.INFORMATION_COMMUNICATION]: 'Information & Communication',
  [COSOComponent.MONITORING]: 'Monitoring',
};

export const COSO_SYSTEM_CONTROLS: Record<COSOComponent, string[]> = {
  [COSOComponent.CONTROL_ENVIRONMENT]: [
    'Role-based access control (RBAC) enforced',
    'Segregation of duties in approval workflows',
    'User authentication with strong passwords',
    'Defined organizational hierarchy for approvals',
  ],
  [COSOComponent.RISK_ASSESSMENT]: [
    'Amount-based workflow routing for high-value transactions',
    'Anomaly detection flags on unusual entries',
    'Fiscal period controls prevent backdating',
    'Risk register maintained and reviewed',
  ],
  [COSOComponent.CONTROL_ACTIVITIES]: [
    'Double-entry validation ensures balanced entries',
    'Blockchain immutability prevents tampering',
    'Multi-level approval for transactions above threshold',
    'Automatic posting only after full approval',
  ],
  [COSOComponent.INFORMATION_COMMUNICATION]: [
    'Complete audit trail for all financial actions',
    'Real-time notifications for pending approvals',
    'Dashboard provides current financial position',
    'Blockchain verification confirms data integrity',
  ],
  [COSOComponent.MONITORING]: [
    'PIECES KPIs tracked continuously',
    'Blockchain vs database reconciliation checks',
    'COSO compliance scoring with trend analysis',
    'Automated integrity verification reports',
  ],
};
