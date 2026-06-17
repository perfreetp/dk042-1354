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
} from '@/types'

const today = new Date().toISOString().split('T')[0]

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
    licenseExpiry: '2025-07-20',
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
    licenseExpiry: '2025-06-25',
  },
  {
    id: 'p-5',
    name: '陈明',
    employeeId: 'EMP005',
    qualifications: ['结构维修证', '高处作业证'],
    licenseExpiry: '2026-08-10',
  },
]

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
    permitExpiry: '2026-06-17T18:00:00',
    isolationMeasures:
      '1. 喷漆区设置防火隔离带；2. 配备2台干粉灭火器；3. 禁止明火作业；4. 接地防静电',
    estimatedEndTime: '2026-06-17T17:30:00',
    riskLevel: 'high',
    status: 'in_progress',
    team: '喷漆一组',
    createdBy: '张伟',
    createdAt: '2026-06-17T08:00:00',
    reviewedBy: '项目经理',
    reviewedAt: '2026-06-17T08:30:00',
    needClientSafety: true,
    clientSafetyNotified: true,
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
    permitExpiry: '2026-06-17T20:00:00',
    isolationMeasures:
      '1. 设置警戒区域；2. 高空作业系安全带；3. 工具防坠落措施；4. 下方禁止人员通行',
    estimatedEndTime: '2026-06-17T18:00:00',
    riskLevel: 'high',
    status: 'in_progress',
    team: '结构二组',
    createdBy: '李强',
    createdAt: '2026-06-17T07:45:00',
    reviewedBy: '项目经理',
    reviewedAt: '2026-06-17T08:15:00',
    needClientSafety: true,
    clientSafetyNotified: true,
    issues: ['license_mismatch'],
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
    permitExpiry: '2026-06-18T12:00:00',
    isolationMeasures:
      '1. 佩戴防尘面罩；2. 设置吸尘设备；3. 防火花飞溅挡板',
    estimatedEndTime: '2026-06-17T16:00:00',
    riskLevel: 'medium',
    status: 'not_started',
    team: '打磨组',
    createdBy: '王芳',
    createdAt: '2026-06-17T09:00:00',
    needClientSafety: false,
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
    permitExpiry: '2026-06-17T14:00:00',
    isolationMeasures:
      '1. 佩戴防护手套和护目镜；2. 设置防滑警示；3. 清洗剂回收处理',
    estimatedEndTime: '2026-06-17T13:00:00',
    riskLevel: 'medium',
    status: 'closed',
    team: '清洗组',
    createdBy: '王芳',
    createdAt: '2026-06-17T07:00:00',
    reviewedBy: '项目经理',
    reviewedAt: '2026-06-17T07:30:00',
    actualEndTime: '2026-06-17T12:45:00',
    needClientSafety: false,
    clientSafetyNotified: false,
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
    estimatedEndTime: '2026-06-17T20:00:00',
    riskLevel: 'critical',
    status: 'not_started',
    team: '喷漆二组',
    createdBy: '刘洋',
    createdAt: '2026-06-17T09:30:00',
    needClientSafety: true,
    issues: ['no_permit', 'permit_expiring', 'out_of_scope'],
  },
]

interface StoreState extends AppState {
  selectedAirlineId: string | null
  selectedBaseId: string | null
  selectedContractId: string | null
  selectedDate: string
  currentView: 'project' | 'fill' | 'report'
  selectedRiskId: string | null
  setSelectedAirlineId: (id: string | null) => void
  setSelectedBaseId: (id: string | null) => void
  setSelectedContractId: (id: string | null) => void
  setSelectedDate: (date: string) => void
  setCurrentView: (view: 'project' | 'fill' | 'report') => void
  setSelectedRiskId: (id: string | null) => void
  addRisk: (risk: Omit<RiskRecord, 'id' | 'createdAt'>) => void
  updateRisk: (id: string, updates: Partial<RiskRecord>) => void
  deleteRisk: (id: string) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      airlines: sampleAirlines,
      bases: sampleBases,
      contracts: sampleContracts,
      risks: sampleRisks,
      people: samplePeople,
      selectedAirlineId: null,
      selectedBaseId: null,
      selectedContractId: null,
      selectedDate: today,
      currentView: 'project',
      selectedRiskId: null,
      setSelectedAirlineId: (id) =>
        set({ selectedAirlineId: id, selectedContractId: null }),
      setSelectedBaseId: (id) =>
        set({ selectedBaseId: id, selectedContractId: null }),
      setSelectedContractId: (id) => set({ selectedContractId: id }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedRiskId: (id) => set({ selectedRiskId: id }),
      addRisk: (risk) =>
        set((state) => ({
          risks: [
            { ...risk, id: uuidv4(), createdAt: new Date().toISOString() },
            ...state.risks,
          ],
        })),
      updateRisk: (id, updates) =>
        set((state) => ({
          risks: state.risks.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      deleteRisk: (id) =>
        set((state) => ({
          risks: state.risks.filter((r) => r.id !== id),
        })),
    }),
    {
      name: 'mro-risk-daily-storage',
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
