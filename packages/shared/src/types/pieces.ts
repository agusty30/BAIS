export enum PiecesDimension {
  PERFORMANCE = 'performance',
  INFORMATION = 'information',
  ECONOMICS = 'economics',
  CONTROL = 'control',
  EFFICIENCY = 'efficiency',
  SERVICE = 'service',
}

export interface PiecesMetric {
  id: string;
  dimension: PiecesDimension;
  metricName: string;
  value: number;
  unit: string;
  measuredAt: Date;
  periodId: string;
}

export interface PiecesDimensionScore {
  dimension: PiecesDimension;
  label: string;
  score: number; // 0-100
  metrics: PiecesMetric[];
  trend: 'up' | 'down' | 'stable';
}

export interface PiecesAnalysis {
  dimensions: PiecesDimensionScore[];
  overallScore: number;
  baselineDate: Date | null;
  currentDate: Date;
}

export const PIECES_DIMENSION_LABELS: Record<PiecesDimension, string> = {
  [PiecesDimension.PERFORMANCE]: 'Performance',
  [PiecesDimension.INFORMATION]: 'Information',
  [PiecesDimension.ECONOMICS]: 'Economics',
  [PiecesDimension.CONTROL]: 'Control',
  [PiecesDimension.EFFICIENCY]: 'Efficiency',
  [PiecesDimension.SERVICE]: 'Service',
};

export const PIECES_METRICS_DEFINITION: Record<PiecesDimension, { name: string; unit: string; description: string }[]> = {
  [PiecesDimension.PERFORMANCE]: [
    { name: 'transaction_throughput', unit: 'tx/min', description: 'Journal entries processed per minute' },
    { name: 'report_generation_time', unit: 'ms', description: 'Time to generate financial reports' },
    { name: 'approval_response_time', unit: 'hours', description: 'Average time to respond to approval requests' },
  ],
  [PiecesDimension.INFORMATION]: [
    { name: 'data_accuracy', unit: '%', description: 'Match rate between PostgreSQL and blockchain data' },
    { name: 'report_timeliness', unit: 'hours', description: 'Time from period close to report availability' },
    { name: 'audit_completeness', unit: '%', description: 'Percentage of actions with complete audit trail' },
  ],
  [PiecesDimension.ECONOMICS]: [
    { name: 'cost_per_transaction', unit: 'USD', description: 'Average cost per journal entry processing' },
    { name: 'error_correction_cost', unit: 'USD', description: 'Cost of correcting entry errors' },
    { name: 'automation_savings', unit: '%', description: 'Reduction in manual processing effort' },
  ],
  [PiecesDimension.CONTROL]: [
    { name: 'unauthorized_access_blocked', unit: 'count', description: 'Number of unauthorized access attempts blocked' },
    { name: 'segregation_violations', unit: 'count', description: 'Number of segregation of duties violations caught' },
    { name: 'tamper_attempts_detected', unit: 'count', description: 'Blockchain integrity violations detected' },
  ],
  [PiecesDimension.EFFICIENCY]: [
    { name: 'approval_cycle_time', unit: 'hours', description: 'End-to-end approval workflow duration' },
    { name: 'automation_rate', unit: '%', description: 'Percentage of processes automated vs manual' },
    { name: 'reconciliation_time', unit: 'minutes', description: 'Time for periodic reconciliation checks' },
  ],
  [PiecesDimension.SERVICE]: [
    { name: 'system_uptime', unit: '%', description: 'System availability percentage' },
    { name: 'user_satisfaction', unit: 'score', description: 'User satisfaction rating (1-10)' },
    { name: 'error_rate', unit: '%', description: 'Percentage of failed operations' },
  ],
};
