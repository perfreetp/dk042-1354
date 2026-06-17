export interface Airline {
  id: string
  name: string
  code: string
}

export interface Base {
  id: string
  name: string
  code: string
  city: string
}

export interface Contract {
  id: string
  name: string
  code: string
  airlineId: string
  baseId: string
  startDate: string
  endDate: string
}

export type WorkType = 'painting' | 'grinding' | 'cleaning' | 'structure' | 'other'

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  painting: '喷漆作业',
  grinding: '打磨作业',
  cleaning: '清洗作业',
  structure: '结构拆装',
  other: '其他高风险',
}

export type RiskStatus = 'not_started' | 'in_progress' | 'closed'

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  not_started: '未开工',
  in_progress: '进行中',
  closed: '已关闭',
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '重大风险',
}

export interface Person {
  id: string
  name: string
  employeeId: string
  qualifications: string[]
  licenseExpiry: string | null
}

export interface RiskRecord {
  id: string
  date: string
  contractId: string
  airlineId: string
  baseId: string
  workType: WorkType
  location: string
  aircraftReg?: string
  description: string
  workers: Person[]
  permitNumber?: string
  permitExpiry?: string
  isolationMeasures: string
  estimatedEndTime: string
  actualEndTime?: string
  riskLevel: RiskLevel
  status: RiskStatus
  team: string
  createdBy: string
  createdAt: string
  reviewedBy?: string
  reviewedAt?: string
  needClientSafety: boolean
  clientSafetyNotified?: boolean
  remarks?: string
  issues: RiskIssue[]
}

export type RiskIssue =
  | 'out_of_scope'
  | 'permit_expiring'
  | 'license_mismatch'
  | 'overdue'
  | 'no_permit'

export const RISK_ISSUE_LABELS: Record<RiskIssue, string> = {
  out_of_scope: '超范围作业',
  permit_expiring: '许可证即将过期',
  license_mismatch: '人员证照不匹配',
  overdue: '已超时未关闭',
  no_permit: '未取得作业许可证',
}

export interface AppState {
  airlines: Airline[]
  bases: Base[]
  contracts: Contract[]
  risks: RiskRecord[]
  people: Person[]
}
