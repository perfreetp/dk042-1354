import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  AppState,
  Airline,
  Base,
  Contract,
  Person,
  RiskRecord,
  RiskIssue,
  ClientSafetyStatus,
} from '@/types'

const today = new Date().toISOString().split('T')[0]
const nowIso = new Date().toISOString()

const sampleAirlines: Airline[] = [
  { id: 'al-1', name: '中国国际航空', code: 'CA' },
  { id: 'al-2', name: '中国东方航空', code: 'MU' },
  { id: 'al-3', name: '中国南方航空', code: 'CZ' },
  { id: 'al-4', name: '海南航空', code: 'HU' },
]

const sampleBases: Base[] = [
  { id: 'base-1', name: '北京首都国际机场', code: 'PEK', city: '北京' },
  { id: 'base-2', name: '上海浦东国际机场', code: 'PVG', city: '上海' },
  { id: 'base-3', name: '广州白云国际机场', code: 'CAN', city: '广州' },
  { id: 'base-4', name: '成都天府国际机场', code: 'TFU', city: '成都' },
]

const sampleContracts: Contract[] = [
  {
    id: 'ct-1',
    name: 'CA-PEK-2024-A检包修',
    code: 'CA/PEK/2024/001',
    airlineId: 'al-1',
    baseId: 'base-1',
    startDate: '2024-01-01',
    endDate: '2026-12-31',
  },
  {
    id: 'ct-2',
    name: 'MU-PVG-2024-喷漆外包',
    code: 'MU/PVG/2024/015',
    airlineId: 'al-2',
    baseId: 'base-2',
    startDate: '2024-01-01',
    endDate: '2026-06-30',
  },
  {
    id: 'ct-3',
    name: 'CZ-CAN-2024-结构维修',
    code: 'CZ/CAN/2024/008',
    airlineId: 'al-3',
    baseId: 'base-3',
    startDate: '2024-03-01',
    endDate: '2026-12-31',
  },
  {
    id: 'ct-4',
    name: 'HU-TFU-2025-日常维护',
    code: 'HU/TFU/2025/003',
    airlineId: 'al-4',
    baseId: 'base-4',
    startDate: '2025-01-01',
    endDate: '2026-12-31',
  },
]

const samplePeople: Person[] = [
  {
    id: 'p-1',
    name: '张伟',
    employeeId: 'EMP001',
    qualifications: ['喷漆作业证', '高处作业证'],
    licenseExpiry: '2026-12-31',
  },
  {
    id: 'p-2',
    name: '李强',
    employeeId: 'EMP002',
    qualifications: ['结构维修证'],
    licenseExpiry: '2026-07-20',
  },
  {
    id: 'p-3',
    name: '王芳',
    employeeId: 'EMP003',
    qualifications: ['打磨作业证', '清洗剂操作证'],
    licenseExpiry: '2027-03-15',
  },
  {
    id: 'p-4',
    name: '刘洋',
    employeeId: 'EMP004',
    qualifications: ['喷漆作业证'],
    licenseExpiry: '2026-06-25',
  },
  {
    id: 'p-5',
    name: '陈明',
    employeeId: 'EMP005',
    qualifications: ['结构维修证', '高处作业证'],
    licenseExpiry: '2026-08-10',
  },
]

function addHours(iso: string, hours: number): string {
  const d = new Date(iso)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

function getDefaultClientSafetyStatus(needClient: boolean): ClientSafetyStatus {
  return needClient ? 'pending_notify' : 'not_required'
}

export function detectIssuesAuto(
  record: Omit<RiskRecord, 'id' | 'createdAt'> | RiskRecord,
  referenceNow?: Date
): RiskIssue[] {
  const now = referenceNow || new Date()
  const detected: Set<RiskIssue> = new Set()

  // 未取得作业许可证（喷漆、打磨、清洗、结构必须有）
  if (record.workType !== 'other') {
    if (!record.permitNumber || record.permitNumber.trim() === '') {
      detected.add('no_permit')
    }
  }

  // 许可证过期/临期
  if (record.permitExpiry) {
    try {
      const expiry = new Date(record.permitExpiry)
      const diffMs = expiry.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      if (diffMs < 0) {
        detected.add('permit_expired')
      } else if (diffHours <= 24) {
        detected.add('permit_expiring')
      }
    } catch {
      /* ignore */
    }
  } else if (record.permitNumber && record.permitNumber.trim()) {
    // 有许可证编号但无过期时间也算临期/信息缺失的异常
    detected.add('permit_expiring')
  }

  // 超时未关闭
  if (record.status !== 'closed' && record.estimatedEndTime) {
    try {
      const end = new Date(record.estimatedEndTime)
      if (end.getTime() < now.getTime()) {
        detected.add('overdue')
      }
    } catch {
      /* ignore */
    }
  }

  // 人员证照不匹配/过期（30天内过期 或 已过期）
  if (record.workers && record.workers.length > 0) {
    for (const w of record.workers) {
      if (!w.licenseExpiry) continue
      try {
        const exp = new Date(w.licenseExpiry)
        const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays <= 30) {
          detected.add('license_mismatch')
          break
        }
      } catch {
        /* ignore */
      }
    }
  }

  // 保留用户手工标记的 out_of_scope
  if (record.issues && record.issues.includes('out_of_scope')) {
    detected.add('out_of_scope')
  }

  return Array.from(detected)
}

const sampleRisks: RiskRecord[] = [
  {
    id: uuidv4(),
    date: today,
    contractId: 'ct-1',
    airlineId: 'al-1',
    baseId: 'base-1',
    workType: 'painting',
    location: 'T3机库-喷漆车间A区',
    aircraftReg: 'B-1234',
    description: 'B737-800机身蒙皮重新喷漆，涉及易燃易爆涂料作业',
    workers: [samplePeople[0], samplePeople[3]],
    permitNumber: 'PT-2026-0617-001',
    permitExpiry: addHours(nowIso, 9),
    isolationMeasures:
      '1. 喷漆区设置防火隔离带；2. 配备2台干粉灭火器；3. 禁止明火作业；4. 接地防静电',
    estimatedEndTime: addHours(nowIso, 8),
    riskLevel: 'high',
    status: 'in_progress',
    team: '喷漆一组',
    createdBy: '张伟',
    createdAt: nowIso,
    reviewedBy: '项目经理',
    reviewedAt: nowIso,
    needClientSafety: true,
    clientSafetyStatus: 'confirmed',
    clientSafetyNotifyTime: addHours(nowIso, -2),
    clientSafetyNotifyPerson: '项目经理',
    clientSafetyConfirmTime: addHours(nowIso, -1),
    clientSafetyConfirmPerson: '王安全员(CA)',
    issues: [],
  },
  {
    id: uuidv4(),
    date: today,
    contractId: 'ct-1',
    airlineId: 'al-1',
    baseId: 'base-1',
    workType: 'structure',
    location: 'T3机库-结构维修区',
    aircraftReg: 'B-5678',
    description: 'A320机翼前缘蒙皮铆钉更换，涉及高处作业和结构拆装',
    workers: [samplePeople[1], samplePeople[4]],
    permitNumber: 'PT-2026-0617-002',
    permitExpiry: addHours(nowIso, 12),
    isolationMeasures:
      '1. 设置警戒区域；2. 高空作业系安全带；3. 工具防坠落措施；4. 下方禁止人员通行',
    estimatedEndTime: addHours(nowIso, 10),
    riskLevel: 'high',
    status: 'in_progress',
    team: '结构二组',
    createdBy: '李强',
    createdAt: nowIso,
    reviewedBy: '项目经理',
    reviewedAt: nowIso,
    needClientSafety: true,
    clientSafetyStatus: 'notified',
    clientSafetyNotifyTime: addHours(nowIso, -1.5),
    clientSafetyNotifyPerson: '项目经理',
    issues: [],
  },
  {
    id: uuidv4(),
    date: today,
    contractId: 'ct-1',
    airlineId: 'al-1',
    baseId: 'base-1',
    workType: 'grinding',
    location: 'T3机库-打磨作业区',
    aircraftReg: 'B-9012',
    description: 'B787发动机整流罩表面打磨除锈',
    workers: [samplePeople[2]],
    permitNumber: 'PT-2026-0617-003',
    permitExpiry: addHours(nowIso, 28),
    isolationMeasures:
      '1. 佩戴防尘面罩；2. 设置吸尘设备；3. 防火花飞溅挡板',
    estimatedEndTime: addHours(nowIso, 7),
    riskLevel: 'medium',
    status: 'not_started',
    team: '打磨组',
    createdBy: '王芳',
    createdAt: nowIso,
    needClientSafety: false,
    clientSafetyStatus: 'not_required',
    issues: [],
  },
  {
    id: uuidv4(),
    date: today,
    contractId: 'ct-1',
    airlineId: 'al-1',
    baseId: 'base-1',
    workType: 'cleaning',
    location: '停机坪45号位',
    aircraftReg: 'B-3456',
    description: 'A330外部深度清洗，使用化学清洗剂',
    workers: [samplePeople[2]],
    permitNumber: 'PT-2026-0617-004',
    permitExpiry: addHours(nowIso, 5),
    isolationMeasures:
      '1. 佩戴防护手套和护目镜；2. 设置防滑警示；3. 清洗剂回收处理',
    estimatedEndTime: addHours(nowIso, 4),
    actualEndTime: addHours(nowIso, 3.8),
    riskLevel: 'medium',
    status: 'closed',
    team: '清洗组',
    createdBy: '王芳',
    createdAt: nowIso,
    reviewedBy: '项目经理',
    reviewedAt: nowIso,
    needClientSafety: false,
    clientSafetyStatus: 'not_required',
    issues: [],
  },
  {
    id: uuidv4(),
    date: today,
    contractId: 'ct-1',
    airlineId: 'al-1',
    baseId: 'base-1',
    workType: 'painting',
    location: 'T3机库-喷漆车间B区',
    aircraftReg: 'B-7788',
    description: 'B737-MAX垂尾标志重新喷涂',
    workers: [samplePeople[3]],
    permitNumber: '',
    isolationMeasures: '暂无',
    estimatedEndTime: addHours(nowIso, -1),
    riskLevel: 'critical',
    status: 'not_started',
    team: '喷漆二组',
    createdBy: '刘洋',
    createdAt: nowIso,
    needClientSafety: true,
    clientSafetyStatus: 'absent',
    clientSafetyNotifyTime: addHours(nowIso, -3),
    clientSafetyNotifyPerson: '项目经理',
    clientSafetyAbsentReason: '客户安全员临时参加安全会议，无法到场，已电话沟通授权',
    issues: ['out_of_scope'],
  },
]

// 对示例数据应用自动问题检测
sampleRisks.forEach((r) => {
  r.issues = detectIssuesAuto(r)
  // 保留手工的 out_of_scope
  if (!r.issues.includes('out_of_scope') && r.workType === 'painting' && !r.permitNumber) {
    // 由 detectIssuesAuto 处理
  }
})

interface StoreState extends AppState {
  selectedAirlineId: string | null
  selectedBaseId: string | null
  selectedContractId: string | null
  selectedDate: string
  currentView: 'project' | 'fill' | 'report' | 'report-print'
  selectedRiskId: string | null
  batchMode: boolean

  setSelectedAirlineId: (id: string | null) => void
  setSelectedBaseId: (id: string | null) => void
  setSelectedContractId: (id: string | null) => void
  setSelectedDate: (date: string) => void
  setCurrentView: (view: 'project' | 'fill' | 'report' | 'report-print') => void
  setSelectedRiskId: (id: string | null) => void
  setBatchMode: (on: boolean) => void

  addRisk: (risk: Omit<RiskRecord, 'id' | 'createdAt'>) => RiskRecord
  updateRisk: (id: string, updates: Partial<RiskRecord>) => void
  deleteRisk: (id: string) => void

  getFilteredRisks: () => RiskRecord[]
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      airlines: sampleAirlines,
      bases: sampleBases,
      contracts: sampleContracts,
      risks: sampleRisks,
      people: samplePeople,
      selectedAirlineId: 'al-1',
      selectedBaseId: 'base-1',
      selectedContractId: null,
      selectedDate: today,
      currentView: 'project',
      selectedRiskId: null,
      batchMode: false,

      setSelectedAirlineId: (id) =>
        set({ selectedAirlineId: id, selectedContractId: null, selectedRiskId: null }),
      setSelectedBaseId: (id) =>
        set({ selectedBaseId: id, selectedContractId: null, selectedRiskId: null }),
      setSelectedContractId: (id) =>
        set({ selectedContractId: id, selectedRiskId: null }),
      setSelectedDate: (date) => set({ selectedDate: date, selectedRiskId: null }),
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedRiskId: (id) => set({ selectedRiskId: id }),
      setBatchMode: (on) => set({ batchMode: on }),

      addRisk: (riskInput) => {
        // 自动检测问题
        const issues = detectIssuesAuto(riskInput)
        // 修正客户安全员状态
        const clientSafetyStatus: ClientSafetyStatus =
          riskInput.clientSafetyStatus ||
          getDefaultClientSafetyStatus(riskInput.needClientSafety)
        const final: RiskRecord = {
          ...riskInput,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          issues,
          clientSafetyStatus,
        }
        set((state) => ({
          risks: [final, ...state.risks],
        }))
        return final
      },

      updateRisk: (id, updates) =>
        set((state) => ({
          risks: state.risks.map((r) => {
            if (r.id !== id) return r
            const merged = { ...r, ...updates }
            // 如果变更了与问题相关的字段，重新自动检测
            const relatedFields = [
              'workType',
              'permitNumber',
              'permitExpiry',
              'status',
              'estimatedEndTime',
              'workers',
              'issues',
            ]
            const shouldReDetect = relatedFields.some((f) =>
              Object.prototype.hasOwnProperty.call(updates, f)
            )
            if (shouldReDetect) {
              merged.issues = detectIssuesAuto(merged)
            }
            // 修正客户安全员状态
            if (Object.prototype.hasOwnProperty.call(updates, 'needClientSafety')) {
              if (!merged.needClientSafety) {
                merged.clientSafetyStatus = 'not_required'
              } else if (
                !merged.clientSafetyStatus ||
                merged.clientSafetyStatus === 'not_required'
              ) {
                merged.clientSafetyStatus = 'pending_notify'
              }
            }
            return merged
          }),
        })),

      deleteRisk: (id) =>
        set((state) => ({
          risks: state.risks.filter((r) => r.id !== id),
          selectedRiskId: state.selectedRiskId === id ? null : state.selectedRiskId,
        })),

      getFilteredRisks: () => {
        const {
          risks,
          selectedDate,
          selectedAirlineId,
          selectedBaseId,
          selectedContractId,
        } = get()
        return risks.filter((r) => {
          if (r.date !== selectedDate) return false
          if (selectedAirlineId && r.airlineId !== selectedAirlineId) return false
          if (selectedBaseId && r.baseId !== selectedBaseId) return false
          if (selectedContractId && r.contractId !== selectedContractId) return false
          return true
        })
      },
    }),
    {
      name: 'mro-risk-daily-storage-v2',
      partialize: (state) => ({
        risks: state.risks,
        selectedAirlineId: state.selectedAirlineId,
        selectedBaseId: state.selectedBaseId,
        selectedContractId: state.selectedContractId,
        selectedDate: state.selectedDate,
      }),
    }
  )
)
