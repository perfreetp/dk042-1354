import React, { useState, useMemo } from 'react'
import { useStore } from '@/store'
import {
  WORK_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_STATUS_LABELS,
  RISK_ISSUE_LABELS,
  type RiskRecord,
  type WorkType,
  type RiskLevel,
  type RiskStatus,
  type RiskIssue,
  type Person,
} from '@/types'
import { format, parseISO, isBefore, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const WORK_TYPES: WorkType[] = ['painting', 'grinding', 'cleaning', 'structure', 'other']
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical']
const RISK_STATUSES: RiskStatus[] = ['not_started', 'in_progress', 'closed']
const RISK_ISSUES: RiskIssue[] = [
  'out_of_scope',
  'permit_expiring',
  'license_mismatch',
  'overdue',
  'no_permit',
]

const emptyForm = (
  date: string,
  contractId: string | null,
  airlineId: string | null,
  baseId: string | null
): Omit<RiskRecord, 'id' | 'createdAt'> => ({
  date,
  contractId: contractId || '',
  airlineId: airlineId || '',
  baseId: baseId || '',
  workType: 'painting',
  location: '',
  aircraftReg: '',
  description: '',
  workers: [],
  permitNumber: '',
  permitExpiry: '',
  isolationMeasures: '',
  estimatedEndTime: '',
  actualEndTime: '',
  riskLevel: 'medium',
  status: 'not_started',
  team: '',
  createdBy: '',
  reviewedBy: '',
  reviewedAt: '',
  needClientSafety: false,
  clientSafetyNotified: false,
  remarks: '',
  issues: [],
})

const RiskFill: React.FC = () => {
  const {
    airlines,
    bases,
    contracts,
    risks,
    people,
    selectedDate,
    selectedContractId,
    selectedAirlineId,
    selectedBaseId,
    selectedRiskId,
    setSelectedRiskId,
    addRisk,
    updateRisk,
    deleteRisk,
  } = useStore()

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<Omit<RiskRecord, 'id' | 'createdAt'>>(
    emptyForm(selectedDate, selectedContractId, selectedAirlineId, selectedBaseId)
  )

  const dayRisks = useMemo(() => {
    return risks.filter((r) => r.date === selectedDate)
  }, [risks, selectedDate])

  const selectedRisk = useMemo(() => {
    return risks.find((r) => r.id === selectedRiskId) || null
  }, [risks, selectedRiskId])

  const handleSelectRisk = (risk: RiskRecord) => {
    setSelectedRiskId(risk.id)
    setIsEditing(false)
  }

  const handleNew = () => {
    setSelectedRiskId(null)
    setIsEditing(true)
    setForm(emptyForm(selectedDate, selectedContractId, selectedAirlineId, selectedBaseId))
  }

  const handleEdit = () => {
    if (!selectedRisk) return
    setForm(selectedRisk)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (selectedRisk) {
      setForm(selectedRisk)
    } else {
      setForm(emptyForm(selectedDate, selectedContractId, selectedAirlineId, selectedBaseId))
    }
  }

  const handleSave = () => {
    if (selectedRiskId && selectedRisk) {
      updateRisk(selectedRiskId, form)
    } else {
      addRisk(form)
    }
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (!selectedRiskId) return
    if (confirm('确定删除此风险记录？')) {
      deleteRisk(selectedRiskId)
      setSelectedRiskId(null)
      setIsEditing(false)
    }
  }

  const toggleWorker = (person: Person) => {
    setForm((prev) => {
      const exists = prev.workers.find((w) => w.id === person.id)
      return {
        ...prev,
        workers: exists
          ? prev.workers.filter((w) => w.id !== person.id)
          : [...prev.workers, person],
      }
    })
  }

  const toggleIssue = (issue: RiskIssue) => {
    setForm((prev) => ({
      ...prev,
      issues: prev.issues.includes(issue)
        ? prev.issues.filter((i) => i !== issue)
        : [...prev.issues, issue],
    }))
  }

  const getAirlineName = (id: string) =>
    airlines.find((a) => a.id === id)?.name || '-'
  const getBaseName = (id: string) =>
    bases.find((b) => b.id === id)?.name || '-'
  const getContractCode = (id: string) =>
    contracts.find((c) => c.id === id)?.code || '-'

  const displayData = isEditing ? form : selectedRisk

  const detectIssues = (record: RiskRecord | Omit<RiskRecord, 'id' | 'createdAt'>) => {
    const detected: RiskIssue[] = []
    const now = new Date()

    if (!record.permitNumber && record.workType !== 'other') {
      detected.push('no_permit')
    }

    if (record.permitExpiry) {
      const expiry = parseISO(record.permitExpiry)
      if (differenceInDays(expiry, now) <= 1) {
        detected.push('permit_expiring')
      }
    }

    if (record.status !== 'closed' && record.estimatedEndTime) {
      const end = parseISO(record.estimatedEndTime)
      if (isBefore(end, now)) {
        detected.push('overdue')
      }
    }

    return detected
  }

  return (
    <div className="h-full flex p-5 gap-5">
      {/* 左侧风险列表 */}
      <div className="w-72 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
            <span>📝</span>
            {selectedDate} 风险记录
          </h3>
          <button
            onClick={handleNew}
            className="px-2.5 py-1 bg-mro-blue hover:bg-mro-blue-light text-white text-xs font-medium rounded transition-colors"
          >
            + 新增
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {dayRisks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              暂无记录，点击"+ 新增"开始填报
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {dayRisks.map((risk) => (
                <button
                  key={risk.id}
                  onClick={() => handleSelectRisk(risk)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                    selectedRiskId === risk.id
                      ? 'bg-mro-blue text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-medium">
                    {WORK_TYPE_LABELS[risk.workType]}
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      selectedRiskId === risk.id ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {risk.location || '未填写位置'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[10px] rounded ${
                        selectedRiskId === risk.id
                          ? 'bg-white/20 text-white'
                          : risk.status === 'not_started'
                          ? 'bg-slate-100 text-slate-600'
                          : risk.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {RISK_STATUS_LABELS[risk.status]}
                    </span>
                    {risk.issues.length > 0 && (
                      <span className="text-[10px] text-red-500">
                        ⚠️ {risk.issues.length}项
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧详情/表单 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {!selectedRisk && !isEditing ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg">请从左侧选择一条风险记录</p>
              <p className="text-sm mt-1">或点击"+ 新增"创建新记录</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span>{isEditing ? '✏️' : '🔍'}</span>
                {isEditing ? (selectedRisk ? '编辑风险记录' : '新增风险记录') : '风险记录详情'}
              </h3>
              <div className="flex items-center gap-2">
                {!isEditing && selectedRisk && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="px-3 py-1.5 bg-mro-blue hover:bg-mro-blue-light text-white text-sm font-medium rounded transition-colors"
                    >
                      编辑
                    </button>
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors"
                    >
                      删除
                    </button>
                  </>
                )}
                {isEditing && (
                  <>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 bg-mro-green hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      保存
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {displayData && (
                <div className="space-y-5 max-w-4xl">
                  {/* 基本信息 */}
                  <Section title="基本信息">
                    <div className="grid grid-cols-3 gap-4">
                      <Field label="客户航司" required>
                        {isEditing ? (
                          <select
                            value={form.airlineId}
                            onChange={(e) =>
                              setForm({ ...form, airlineId: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          >
                            <option value="">请选择</option>
                            {airlines.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700">
                            {getAirlineName(displayData.airlineId)}
                          </span>
                        )}
                      </Field>
                      <Field label="维修基地" required>
                        {isEditing ? (
                          <select
                            value={form.baseId}
                            onChange={(e) =>
                              setForm({ ...form, baseId: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          >
                            <option value="">请选择</option>
                            {bases.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.code} - {b.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700">
                            {getBaseName(displayData.baseId)}
                          </span>
                        )}
                      </Field>
                      <Field label="合同项目" required>
                        {isEditing ? (
                          <select
                            value={form.contractId}
                            onChange={(e) =>
                              setForm({ ...form, contractId: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          >
                            <option value="">请选择</option>
                            {contracts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700 font-mono text-sm">
                            {getContractCode(displayData.contractId)}
                          </span>
                        )}
                      </Field>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <Field label="作业类型" required>
                        {isEditing ? (
                          <select
                            value={form.workType}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                workType: e.target.value as WorkType,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          >
                            {WORK_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {WORK_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-700">
                            {WORK_TYPE_LABELS[displayData.workType]}
                          </span>
                        )}
                      </Field>
                      <Field label="风险等级" required>
                        {isEditing ? (
                          <select
                            value={form.riskLevel}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                riskLevel: e.target.value as RiskLevel,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          >
                            {RISK_LEVELS.map((l) => (
                              <option key={l} value={l}>
                                {RISK_LEVEL_LABELS[l]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <RiskLevelBadge level={displayData.riskLevel} />
                        )}
                      </Field>
                      <Field label="作业状态" required>
                        {isEditing ? (
                          <select
                            value={form.status}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                status: e.target.value as RiskStatus,
                              })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          >
                            {RISK_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {RISK_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge status={displayData.status} />
                        )}
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Field label="作业位置" required>
                        {isEditing ? (
                          <input
                            type="text"
                            value={form.location}
                            onChange={(e) =>
                              setForm({ ...form, location: e.target.value })
                            }
                            placeholder="例如：T3机库-喷漆车间A区"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          />
                        ) : (
                          <span className="text-slate-700">
                            {displayData.location}
                          </span>
                        )}
                      </Field>
                      <Field label="飞机注册号">
                        {isEditing ? (
                          <input
                            type="text"
                            value={form.aircraftReg || ''}
                            onChange={(e) =>
                              setForm({ ...form, aircraftReg: e.target.value })
                            }
                            placeholder="例如：B-1234"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue font-mono"
                          />
                        ) : (
                          <span className="text-slate-700 font-mono">
                            {displayData.aircraftReg || '-'}
                          </span>
                        )}
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Field label="作业班组" required>
                        {isEditing ? (
                          <input
                            type="text"
                            value={form.team}
                            onChange={(e) =>
                              setForm({ ...form, team: e.target.value })
                            }
                            placeholder="例如：喷漆一组"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          />
                        ) : (
                          <span className="text-slate-700">{displayData.team}</span>
                        )}
                      </Field>
                      <Field label="填报人">
                        {isEditing ? (
                          <input
                            type="text"
                            value={form.createdBy}
                            onChange={(e) =>
                              setForm({ ...form, createdBy: e.target.value })
                            }
                            placeholder="班组长姓名"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          />
                        ) : (
                          <span className="text-slate-700">
                            {displayData.createdBy}
                          </span>
                        )}
                      </Field>
                    </div>
                    <div className="mt-4">
                      <Field label="风险描述" required>
                        {isEditing ? (
                          <textarea
                            value={form.description}
                            onChange={(e) =>
                              setForm({ ...form, description: e.target.value })
                            }
                            rows={3}
                            placeholder="详细描述作业内容及潜在风险..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue resize-none"
                          />
                        ) : (
                          <span className="text-slate-700 whitespace-pre-wrap">
                            {displayData.description}
                          </span>
                        )}
                      </Field>
                    </div>
                  </Section>

                  {/* 人员与资质 */}
                  <Section title="作业人员与资质">
                    <Field label="选择作业人员">
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                          {people.map((p) => {
                            const selected = form.workers.find((w) => w.id === p.id)
                            return (
                              <label
                                key={p.id}
                                className={`flex items-start gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${
                                  selected
                                    ? 'border-mro-blue bg-blue-50'
                                    : 'border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selected}
                                  onChange={() => toggleWorker(p)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-slate-800">
                                    {p.name}
                                    <span className="ml-1.5 text-xs text-slate-500 font-normal">
                                      {p.employeeId}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {p.qualifications.join(' · ')}
                                  </div>
                                  {p.licenseExpiry && (
                                    <div
                                      className={`text-xs mt-0.5 ${
                                        differenceInDays(
                                          parseISO(p.licenseExpiry),
                                          new Date()
                                        ) <= 30
                                          ? 'text-red-600'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      证照有效期至：{p.licenseExpiry}
                                    </div>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      ) : displayData.workers.length > 0 ? (
                        <div className="space-y-2">
                          {displayData.workers.map((w) => (
                            <div
                              key={w.id}
                              className="flex items-center gap-3 p-2 bg-slate-50 rounded"
                            >
                              <div className="w-8 h-8 rounded-full bg-mro-blue flex items-center justify-center text-white text-sm font-medium">
                                {w.name.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-800">
                                  {w.name}
                                  <span className="ml-2 text-xs text-slate-500 font-normal">
                                    {w.employeeId}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {w.qualifications.join(' · ')}
                                </div>
                              </div>
                              {w.licenseExpiry && (
                                <span
                                  className={`text-xs ${
                                    differenceInDays(
                                      parseISO(w.licenseExpiry),
                                      new Date()
                                    ) <= 30
                                      ? 'text-red-600'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  证照至 {w.licenseExpiry}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">未选择作业人员</span>
                      )}
                    </Field>
                  </Section>

                  {/* 许可证与隔离 */}
                  <Section title="作业许可证与隔离措施">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="许可证编号">
                        {isEditing ? (
                          <input
                            type="text"
                            value={form.permitNumber || ''}
                            onChange={(e) =>
                              setForm({ ...form, permitNumber: e.target.value })
                            }
                            placeholder="例如：PT-2026-0617-001"
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue font-mono"
                          />
                        ) : (
                          <span className="text-slate-700 font-mono">
                            {displayData.permitNumber || '-'}
                          </span>
                        )}
                      </Field>
                      <Field label="许可证到期时间">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={form.permitExpiry || ''}
                            onChange={(e) =>
                              setForm({ ...form, permitExpiry: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          />
                        ) : (
                          <span className="text-slate-700">
                            {displayData.permitExpiry
                              ? format(parseISO(displayData.permitExpiry), 'yyyy-MM-dd HH:mm', {
                                  locale: zhCN,
                                })
                              : '-'}
                          </span>
                        )}
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Field label="预计结束时间" required>
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={form.estimatedEndTime || ''}
                            onChange={(e) =>
                              setForm({ ...form, estimatedEndTime: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          />
                        ) : (
                          <span className="text-slate-700">
                            {format(parseISO(displayData.estimatedEndTime), 'yyyy-MM-dd HH:mm', {
                              locale: zhCN,
                            })}
                          </span>
                        )}
                      </Field>
                      <Field label="实际结束时间">
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            value={form.actualEndTime || ''}
                            onChange={(e) =>
                              setForm({ ...form, actualEndTime: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                          />
                        ) : (
                          <span className="text-slate-700">
                            {displayData.actualEndTime
                              ? format(parseISO(displayData.actualEndTime), 'yyyy-MM-dd HH:mm', {
                                  locale: zhCN,
                                })
                              : '-'}
                          </span>
                        )}
                      </Field>
                    </div>
                    <div className="mt-4">
                      <Field label="隔离措施" required>
                        {isEditing ? (
                          <textarea
                            value={form.isolationMeasures}
                            onChange={(e) =>
                              setForm({ ...form, isolationMeasures: e.target.value })
                            }
                            rows={4}
                            placeholder="1. ...&#10;2. ...&#10;3. ..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue resize-none"
                          />
                        ) : (
                          <span className="text-slate-700 whitespace-pre-wrap">
                            {displayData.isolationMeasures}
                          </span>
                        )}
                      </Field>
                    </div>
                  </Section>

                  {/* 项目经理审核 */}
                  <Section title="项目经理审核">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="需客户方安全员到场">
                        {isEditing ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.needClientSafety}
                              onChange={(e) =>
                                setForm({ ...form, needClientSafety: e.target.checked })
                              }
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-slate-700">
                              是，需客户安全员到场监督
                            </span>
                          </label>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-medium rounded ${
                              displayData.needClientSafety
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {displayData.needClientSafety ? '需客户安全员到场' : '无需客户安全员'}
                          </span>
                        )}
                      </Field>
                      {displayData.needClientSafety && (
                        <Field label="已通知客户安全员">
                          {isEditing ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={form.clientSafetyNotified || false}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    clientSafetyNotified: e.target.checked,
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-slate-700">已通知</span>
                            </label>
                          ) : (
                            <span
                              className={`inline-block px-2.5 py-1 text-xs font-medium rounded ${
                                displayData.clientSafetyNotified
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {displayData.clientSafetyNotified ? '已通知 ✓' : '未通知 ⚠'}
                            </span>
                          )}
                        </Field>
                      )}
                    </div>
                    {!isEditing && displayData.reviewedBy && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <Field label="审核人">
                          <span className="text-slate-700">
                            {displayData.reviewedBy}
                          </span>
                        </Field>
                        <Field label="审核时间">
                          <span className="text-slate-700">
                            {displayData.reviewedAt
                              ? format(parseISO(displayData.reviewedAt), 'yyyy-MM-dd HH:mm', {
                                  locale: zhCN,
                                })
                              : '-'}
                          </span>
                        </Field>
                      </div>
                    )}
                  </Section>

                  {/* 问题标识 */}
                  <Section title="问题标识">
                    <Field label="问题标记（系统自动检测 + 手动标记）">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          {RISK_ISSUES.map((issue) => {
                            const checked = form.issues.includes(issue)
                            return (
                              <label
                                key={issue}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer text-sm transition-colors ${
                                  checked
                                    ? 'bg-red-50 border-red-300 text-red-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleIssue(issue)}
                                />
                                {RISK_ISSUE_LABELS[issue]}
                              </label>
                            )
                          })}
                        </div>
                      ) : displayData.issues.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {displayData.issues.map((issue) => (
                            <span
                              key={issue}
                              className="inline-block px-3 py-1 text-xs font-medium bg-red-100 text-red-700 border border-red-200 rounded"
                            >
                              ⚠️ {RISK_ISSUE_LABELS[issue]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-green-600 text-sm">✓ 未发现问题</span>
                      )}
                    </Field>
                    {isEditing && selectedRisk && (
                      <div className="mt-3 text-xs text-slate-500 bg-slate-50 p-2.5 rounded">
                        💡 系统自动检测到的问题：
                        {detectIssues(form).length > 0 ? (
                          <span className="ml-1 text-red-600">
                            {detectIssues(form).map((i) => RISK_ISSUE_LABELS[i]).join('、')}
                          </span>
                        ) : (
                          <span className="ml-1 text-green-600">无</span>
                        )}
                      </div>
                    )}
                  </Section>

                  {/* 备注 */}
                  <Section title="备注">
                    <Field label="补充说明">
                      {isEditing ? (
                        <textarea
                          value={form.remarks || ''}
                          onChange={(e) =>
                            setForm({ ...form, remarks: e.target.value })
                          }
                          rows={2}
                          placeholder="其他需要说明的事项..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue resize-none"
                        />
                      ) : (
                        <span className="text-slate-700">
                          {displayData.remarks || '-'}
                        </span>
                      )}
                    </Field>
                  </Section>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="border border-slate-200 rounded-lg overflow-hidden">
    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
      <h4 className="font-semibold text-sm text-slate-700">{title}</h4>
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const Field: React.FC<{
  label: string
  required?: boolean
  children: React.ReactNode
}> = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
)

const RiskLevelBadge: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const colors: Record<RiskLevel, string> = {
    low: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border ${colors[level]}`}
    >
      {RISK_LEVEL_LABELS[level]}
    </span>
  )
}

const StatusBadge: React.FC<{ status: RiskStatus }> = ({ status }) => {
  const colors: Record<RiskStatus, string> = {
    not_started: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-amber-100 text-amber-800',
    closed: 'bg-green-100 text-green-800',
  }
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${colors[status]}`}
    >
      {RISK_STATUS_LABELS[status]}
    </span>
  )
}

export default RiskFill
