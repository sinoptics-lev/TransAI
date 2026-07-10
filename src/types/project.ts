export interface Project {
  id: number;
  link: string;
  name: string;
  topic: string;
  department: string;
  startDate: string;
  endDate: string;
  effects: string;
  effectType: string;
  effectAmount: number;
  laborRelease: number;
  reductionPlan: number;
  mingos: string;
  costFOT: number;
  costDirect: number;
  costInfra: number;
  costTotal: number;
  economicEffect: number;
  delta: number;
  nonMaterialEffect: string;
  /** Raw row data from source XLSX for exact re-export */
  _raw?: (string | number)[];
  /** Status from RM */
  rmStatus?: string;
  /** Additional fields from DB */
  dbStatus?: string;
  dbLeader?: string;
  dbResponsible?: string;
  laborClaimed?: number;
  reductionActual?: number;
  releaseOther?: number;
  reductionDate?: string;
  createdDate?: string;
  updatedDate?: string;
  /** AI Analysis data - key-value pairs from AI analysis file */
  aiAnalysis?: AIAnalysis;
  /** AI verdict: рекомендован / не рекомендован / Нет данных */
  aiVerdict?: string;
  /** AI reasoning text */
  aiReasoning?: string;
}

export interface AIAnalysis {
  [columnName: string]: string;
}

export interface DepartmentProjects {
  department: string;
  mingos: number;
  noMingos: number;
  total: number;
  mingosPct: number;
  noMingosPct: number;
}

export interface DepartmentCosts {
  department: string;
  fot: number;
  direct: number;
  infra: number;
  total: number;
  fotPct: number;
  directPct: number;
  infraPct: number;
}

export interface DepartmentReduction {
  department: string;
  reduction: number;
  labor: number;
  total: number;
  reductionPct: number;
  laborPct: number;
}

export interface DepartmentFinancial {
  department: string;
  finEffect: number;
  fromReduction: number;
  finPct: number;
  fromReductionPct: number;
}

export interface EfficiencyKPI {
  profitablePct: number;
  lossPct: number;
  avgDelta: number;
  medianDelta: number;
  highEfficiencyPct: number;
  totalProjects: number;
}

export interface EfficiencyCategory {
  key: string;
  label: string;
  range: string;
  count: number;
  pct: number;
  color: string;
  light: string;
  totalDelta: number;
}

export interface EfficiencyProject {
  name: string;
  dept: string;
  delta: number;
  costs: number;
  labor: number;
}

export interface EfficiencyData {
  kpi: EfficiencyKPI;
  distribution: EfficiencyCategory[];
  topProfitable: EfficiencyProject[];
  topLoss: EfficiencyProject[];
}

export interface DashboardData {
  projects: Project[];
  departmentList: string[];
  totalProjects: number;
  mingosProjects: number;
  noMingosProjects: number;
  totalCost: number;
  costFOT: number;
  costDirect: number;
  costInfra: number;
  totalLaborRelease: number;
  totalLaborClaimed: number;
  totalReduction: number;
  totalFinancialEffect: number;
  departmentCount: number;
  deptProjects: DepartmentProjects[];
  deptCosts: DepartmentCosts[];
  deptReduction: DepartmentReduction[];
  deptFinancial: DepartmentFinancial[];
}
