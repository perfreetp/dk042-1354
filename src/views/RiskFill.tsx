import React, { useState, useMemo, useEffect } from 'react'
import { useStore, detectIssuesAuto } from '@/store'
import {
  WORK_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_STATUS_LABELS,
  RISK_ISSUE_LABELS,
  CLIENT_SAFETY_STATUS_LABELS,
  type RiskRecord,
  type WorkType,
  type RiskLevel,
  type RiskStatus,
  type RiskIssue,
  type Person,
  type ClientSafetyStatus,
} from '@/types'
import { format, parseISO, differenceInDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const WORK_TYPES: WorkType[] = ['painting', 'grinding', 'cleaning', 'structure', 'other']
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical']
const RISK_STATUSES: RiskStatus[] = ['not_started', 'in_progress', 'closed']
const MANUAL_ISSUES: RiskIssue[] = ['out_of_scope']
const CLIENT_SAFETY_OPTIONS: ClientSafetyStatus[] = [
  'pending_notify',
  'notified',
  'confirmed',
  'absent',
]

function emptyForm(
  date: string,
  contractId: string | null,
  airlineId: string | null,
  baseId: string | null
): Omit<RiskRecord, 'id' | 'createdAt'> {
  return {
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
    clientSafetyStatus: 'not_required',
    clientSafetyNotifyTime: '',
    clientSafetyNotifyPerson: '',
    clientSafetyConfirmTime: '',
    clientSafetyConfirmPerson: '',
    clientSafetyAbsentReason: '',
    remarks: '',
    issues: [],
  }
}

const clientStatusColors: Record<ClientSafetyStatus, string> = {
  not_required: 'bg-slate-100 text-slate-600 border-slate-200',
  pending_notify: 'bg-amber-100 text-amber-700 border-amber-200',
  notified: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
}

const RiskFill: React.FC = () => {
  const {
    airlines,
    bases,
    contracts,
    people,
    selectedDate,
    selectedContractId,
    selectedAirlineId,
    selectedBaseId,
    selectedRiskId,
    batchMode,
    setSelectedRiskId,
    setBatchMode,
    addRisk,
    updateRisk,
    deleteRisk,
    getFilteredRisks,
  } = useStore()

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<Omit<RiskRecord, 'id' | 'createdAt'>>(
    emptyForm(selectedDate, selectedContractId, selectedAirlineId, selectedBaseId)
  )
  const [saveToast, setSaveToast] = useState<string>('')

  const dayRisks = useMemo(() => getFilteredRisks(), [getFilteredRisks])

  const selectedRisk = useMemo(() => {
    return dayRisks.find((r) => r.id === selectedRiskId) || null
  }, [dayRisks, selectedRiskId])

  // 当筛选条件变化时，如果是新建状态，同步表单默认值
  useEffect(() => {
    if (!selectedRiskId && !isEditing) {
      // 保持，只有用户点新增时才更新
    }
  }, [selectedContractId, selectedAirlineId, selectedBaseId, selectedDate])

  // 自动检测实时问题提示
  const liveDetectedIssues = useMemo(() => {
    if (!isEditing) return null
    return detectIssuesAuto(form)
  }, [form, isEditing])

  const handleSelectRisk = (risk: RiskRecord) => {
    setSelectedRiskId(risk.id)
    setIsEditing(false)
    setBatchMode(false)
  }

  const handleNew = (resetTeamAndLocation = true) => {
    setSelectedRiskId(null)
    setIsEditing(true)
    const base = emptyForm(selectedDate, selectedContractId, selectedAirlineId, selectedBaseId)
    if (!resetTeamAndLocation && form) {
      // 批量录入：保留班组、航司/基地/合同、作业类型默认、风险等级默认
      base.team = form.team || ''
      base.workers = form.workers || []
      base.createdBy = form.createdBy || ''
      base.needClientSafety = form.needClientSafety || false
      if (base.needClientSafety) {
        base.clientSafetyStatus = form.clientSafetyStatus || 'pending_notify'
        base.clientSafetyNotifyPerson = form.clientSafetyNotifyPerson || ''
      }
      base.riskLevel = form.riskLevel || 'medium'
      base.isolationMeasures = form.isolationMeasures || ''
    }
    setForm(base)
  }

  const handleEdit = () => {
    if (!selectedRisk) return
    setForm(selectedRisk)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setBatchMode(false)
    if (selectedRisk) {
      setForm(selectedRisk)
    }
  }

  const showToast = (msg: string) => {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(''), 2500)
  }

  const handleSave = () => {
    // 简单校验
    if (!form.airlineId || !form.baseId || !form.contractId) {
      alert('请完善客户航司、维修基地、合同项目')
      return
    }
    if (!form.location || !form.team || !form.workType || !form.description || !form.estimatedEndTime) {
      alert('请完善作业位置、班组、作业类型、风险描述、预计结束时间')
      return
    }
    // 客户安全员状态联动
    let clientSafetyStatus: ClientSafetyStatus = form.clientSafetyStatus
    if (!form.needClientSafety) {
      clientSafetyStatus = 'not_required'
    } else if (!clientSafetyStatus || clientSafetyStatus === 'not_required') {
      clientSafetyStatus = 'pending_notify'
    }

    const payload: Omit<RiskRecord, 'id' | 'createdAt'> = {
      ...form,
      clientSafetyStatus,
      needClientSafety: form.needClientSafety,
    }

    if (selectedRiskId && selectedRisk) {
      updateRisk(selectedRiskId, payload)
      showToast('✓ 已更新风险记录，问题标签已自动刷新')
      setIsEditing(false)
      // 自动重新查询以展示最新问题标签
      setForm({ ...selectedRisk, ...payload })
    } else {
      const saved = addRisk(payload)
      showToast(batchMode ? '✓ 已保存，可继续批量录入下一条' : '✓ 已创建新风险记录')
      setSelectedRiskId(saved.id)
      if (batchMode) {
        // 批量录入：创建后保留编辑模式，清部分字段
        handleNew(false)
      } else {
        setIsEditing(false)
        setForm(saved)
      }
    }
  }

  const handleDelete = () => {
    if (!selectedRiskId) return
    if (confirm('确定删除此风险记录？')) {
      deleteRisk(selectedRiskId)
      setIsEditing(false)
      setBatchMode(false)
      setForm(emptyForm(selectedDate, selectedContractId, selectedAirlineId, selectedBaseId))
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

  const toggleManualIssue = (issue: RiskIssue) => {
    setForm((prev) => ({
      ...prev,
      issues: prev.issues.includes(issue)
        ? prev.issues.filter((i) => i !== issue)
        : [...prev.issues, issue],
    }))
  }

  // 快捷动作：一键通知客户安全员
  const markNotified = () => {
    const now = new Date().toISOString()
    const updates: Partial<RiskRecord> = {
      clientSafetyStatus: 'notified',
      clientSafetyNotifyTime: now,
      clientSafetyNotifyPerson: form.clientSafetyNotifyPerson || '项目经理',
    }
    setForm({ ...form, ...updates })
    if (selectedRiskId) updateRisk(selectedRiskId, updates)
  }
  const markConfirmed = () => {
    const now = new Date().toISOString()
    const updates: Partial<RiskRecord> = {
      clientSafetyStatus: 'confirmed',
      clientSafetyConfirmTime: now,
      clientSafetyConfirmPerson: form.clientSafetyConfirmPerson || '客户安全员',
    }
    setForm({ ...form, ...updates })
    if (selectedRiskId) updateRisk(selectedRiskId, updates)
  }
  const markAbsent = (reason: string) => {
    const updates: Partial<RiskRecord> = {
      clientSafetyStatus: 'absent',
      clientSafetyAbsentReason: reason,
    }
    setForm({ ...form, ...updates })
    if (selectedRiskId) updateRisk(selectedRiskId, updates)
  }

  const displayData = isEditing ? form : selectedRisk
  const activeIssues = isEditing
    ? Array.from(new Set([...(liveDetectedIssues || []), ...(form.issues.filter(i => MANUAL_ISSUES.includes(i)))]))
    : (selectedRisk?.issues || [])

  const formatDT = (iso?: string) => {
    if (!iso) return '-'
    try {
      return format(parseISO(iso), 'yyyy-MM-dd HH:mm', { locale: zhCN })
    } catch {
      return iso
    }
  }

  return (
    <div className="h-full flex p-5 gap-5 relative">
      {/* 顶部批量录入 Toast */}
      {saveToast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg text-sm font-medium animate-fade-in">
          {saveToast}
        </div>
      )}

      {/* 左侧风险列表 */}
      <div className="w-72 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>📝</span>
              风险记录
            </h3>
            <button
              onClick={() => handleNew(true)}
              className="px-2.5 py-1 bg-mro-blue hover:bg-mro-blue-light text-white text-xs font-medium rounded transition-colors"
            >
              + 新增
            </button>
          </div>
          <div className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded">
            已筛选：{dayRisks.length} 条（仅当前项目范围）
          </div>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer text-slate-600 mt-1">
            <input
              type="checkbox"
              checked={batchMode}
              onChange={(e) => {
                setBatchMode(e.target.checked)
                if (e.target.checked && !isEditing) handleNew(true)
              }}
              className="w-3.5 h-3.5"
            />
            批量录入模式（保存后继续新增）
          </label>
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
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
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
                        ⚠️ {risk.issues.length}
                      </span>
                    )}
                    {risk.needClientSafety && (
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] rounded border ${
                          selectedRiskId === risk.id
                            ? 'bg-white/20 border-white/30 text-white'
                            : clientStatusColors[risk.clientSafetyStatus]
                        }`}
                      >
                        👮 {CLIENT_SAFETY_STATUS_LABELS[risk.clientSafetyStatus]}
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
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span>{isEditing ? '✏️' : '🔍'}</span>
                  {isEditing
                    ? selectedRisk
                      ? '编辑风险记录'
                      : batchMode
                      ? '批量新增风险记录'
                      : '新增风险记录'
                    : '风险记录详情'}
                </h3>
                {batchMode && isEditing && (
                  <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                    批量录入中
                  </span>
                )}
                {activeIssues.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded">
                    ⚠️ {activeIssues.length} 项自动检测问题
                  </span>
                )}
              </div>
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
                      {batchMode ? '结束批量' : '取消'}
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-1.5 bg-mro-green hover:bg-green-700 text-white text-sm font-medium rounded transition-colors shadow-sm"
                    >
                      {batchMode && !selectedRisk ? '保存并继续下一条' : '保存'}
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
                            {airlines.find(a => a.id === displayData.airlineId)?.name || '-'}
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
                            {bases.find(b => b.id === displayData.baseId)?.name || '-'}
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
                            {contracts
                              .filter(c =>
                                (!form.airlineId || c.airlineId === form.airlineId) &&
                                (!form.baseId || c.baseId === form.baseId)
                              )
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.code} · {c.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span className="text-slate-700 font-mono text-sm">
                            {contracts.find(c => c.id === displayData.contractId)?.code || '-'}
                          </span>
                        )}
                      </Field>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <Field label="作业类型" required>
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1.5">
                            {WORK_TYPES.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setForm({ ...form, workType: t })}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                                  form.workType === t
                                    ? 'bg-mro-blue text-white border-mro-blue'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {WORK_TYPE_LABELS[t]}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-700">
                            {WORK_TYPE_LABELS[displayData.workType]}
                          </span>
                        )}
                      </Field>
                      <Field label="风险等级" required>
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1.5">
                            {RISK_LEVELS.map((l) => (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setForm({ ...form, riskLevel: l })}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                                  form.riskLevel === l
                                    ? l === 'critical'
                                      ? 'bg-red-600 text-white border-red-600'
                                      : l === 'high'
                                      ? 'bg-orange-500 text-white border-orange-500'
                                      : l === 'medium'
                                      ? 'bg-yellow-500 text-white border-yellow-500'
                                      : 'bg-green-500 text-white border-green-500'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {RISK_LEVEL_LABELS[l]}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <RiskLevelBadge level={displayData.riskLevel} />
                        )}
                      </Field>
                      <Field label="作业状态" required>
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1.5">
                            {RISK_STATUSES.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setForm({ ...form, status: s })}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                                  form.status === s
                                    ? 'bg-slate-700 text-white border-slate-700'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {RISK_STATUS_LABELS[s]}
                              </button>
                            ))}
                          </div>
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
                            placeholder="例如：喷漆一组（批量模式下保存后将复用）"
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
                            const expiring = p.licenseExpiry &&
                              differenceInDays(parseISO(p.licenseExpiry), new Date()) <= 30
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
                                    {expiring && (
                                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-200">
                                        证照30天内到期
                                      </span>
                                    )}
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
                              ? formatDT(displayData.permitExpiry)
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
                            {formatDT(displayData.estimatedEndTime)}
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
                              ? formatDT(displayData.actualEndTime)
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

                  {/* 项目经理审核 - 客户安全员闭环 */}
                  <Section title="项目经理审核 · 客户安全员到场闭环">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Field label="是否需要客户方安全员到场">
                        {isEditing ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.needClientSafety}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  needClientSafety: e.target.checked,
                                  clientSafetyStatus: e.target.checked
                                    ? (form.clientSafetyStatus === 'not_required'
                                      ? 'pending_notify'
                                      : form.clientSafetyStatus || 'pending_notify')
                                    : 'not_required',
                                })
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
                        <Field label="当前状态">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-medium rounded border ${
                              clientStatusColors[displayData.clientSafetyStatus]
                            }`}
                          >
                            {CLIENT_SAFETY_STATUS_LABELS[displayData.clientSafetyStatus]}
                          </span>
                        </Field>
                      )}
                    </div>

                    {displayData.needClientSafety && (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <Field label="通知时间">
                            {isEditing ? (
                              <input
                                type="datetime-local"
                                value={form.clientSafetyNotifyTime || ''}
                                onChange={(e) =>
                                  setForm({ ...form, clientSafetyNotifyTime: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                              />
                            ) : (
                              <span className="text-slate-700 text-sm">
                                {formatDT(displayData.clientSafetyNotifyTime)}
                              </span>
                            )}
                          </Field>
                          <Field label="通知人（我方）">
                            {isEditing ? (
                              <input
                                type="text"
                                value={form.clientSafetyNotifyPerson || ''}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    clientSafetyNotifyPerson: e.target.value,
                                  })
                                }
                                placeholder="例如：项目经理"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                              />
                            ) : (
                              <span className="text-slate-700 text-sm">
                                {displayData.clientSafetyNotifyPerson || '-'}
                              </span>
                            )}
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <Field label="到场确认时间">
                            {isEditing ? (
                              <input
                                type="datetime-local"
                                value={form.clientSafetyConfirmTime || ''}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    clientSafetyConfirmTime: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                              />
                            ) : (
                              <span className="text-slate-700 text-sm">
                                {formatDT(displayData.clientSafetyConfirmTime)}
                              </span>
                            )}
                          </Field>
                          <Field label="到场确认人（客户）">
                            {isEditing ? (
                              <input
                                type="text"
                                value={form.clientSafetyConfirmPerson || ''}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    clientSafetyConfirmPerson: e.target.value,
                                  })
                                }
                                placeholder="例如：王安全员(CA)"
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue"
                              />
                            ) : (
                              <span className="text-slate-700 text-sm">
                                {displayData.clientSafetyConfirmPerson || '-'}
                              </span>
                            )}
                          </Field>
                        </div>
                        <Field label="未到场原因（若未到场）">
                          {isEditing ? (
                            <textarea
                              value={form.clientSafetyAbsentReason || ''}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  clientSafetyAbsentReason: e.target.value,
                                })
                              }
                              rows={2}
                              placeholder="若客户安全员未到场，请说明原因及后续处理..."
                              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue resize-none"
                            />
                          ) : (
                            <span className="text-slate-700 text-sm whitespace-pre-wrap">
                              {displayData.clientSafetyAbsentReason || '-'}
                            </span>
                          )}
                        </Field>

                        {/* 快捷状态按钮 */}
                        {isEditing && (
                          <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                            <span className="text-xs text-slate-500 self-center mr-1">
                              快捷操作：
                            </span>
                            <button
                              type="button"
                              onClick={markNotified}
                              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded"
                            >
                              📢 记录为已通知
                            </button>
                            <button
                              type="button"
                              onClick={markConfirmed}
                              className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded"
                            >
                              ✅ 记录为已到场
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt('请输入未到场原因：', '客户安全员临时有其他工作安排，已电话告知，待补签')
                                if (reason) markAbsent(reason)
                              }}
                              className="px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded"
                            >
                              ❌ 记录为未到场
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {!isEditing && selectedRisk?.reviewedBy && (
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100">
                        <Field label="审核人">
                          <span className="text-slate-700">
                            {selectedRisk.reviewedBy}
                          </span>
                        </Field>
                        <Field label="审核时间">
                          <span className="text-slate-700">
                            {selectedRisk.reviewedAt ? formatDT(selectedRisk.reviewedAt) : '-'}
                          </span>
                        </Field>
                      </div>
                    )}
                  </Section>

                  {/* 问题标识 */}
                  <Section title="问题标识（保存时自动检测）">
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-2">
                          自动检测项（保存时刷新，无需手工勾选）：
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['no_permit', 'permit_expired', 'permit_expiring', 'overdue', 'license_mismatch'].map((k) => {
                            const issue = k as RiskIssue
                            const active = activeIssues.includes(issue)
                            return (
                              <span
                                key={issue}
                                className={`inline-block px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                                  active
                                    ? 'bg-red-100 text-red-700 border-red-300'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                }`}
                              >
                                {active ? '⚠️ ' : '✓ '}
                                {RISK_ISSUE_LABELS[issue]}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-2">
                          手工标记项（由项目经理判断勾选）：
                        </div>
                        {isEditing ? (
                          <div className="flex flex-wrap gap-2">
                            {MANUAL_ISSUES.map((issue) => {
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
                                    onChange={() => toggleManualIssue(issue)}
                                  />
                                  {RISK_ISSUE_LABELS[issue]}
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {MANUAL_ISSUES.map((issue) => {
                              const active =
                                displayData.issues && displayData.issues.includes(issue)
                              return (
                                <span
                                  key={issue}
                                  className={`inline-block px-2.5 py-1 text-xs font-medium rounded border ${
                                    active
                                      ? 'bg-red-100 text-red-700 border-red-300'
                                      : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                                  }`}
                                >
                                  {active ? '⚠️ ' : '✓ '}
                                  {RISK_ISSUE_LABELS[issue]}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {isEditing && liveDetectedIssues && (
                        <div className="text-xs text-slate-600 bg-blue-50/60 border border-blue-100 p-2.5 rounded">
                          💡 当前自动检测结果：
                          {liveDetectedIssues.length > 0 ? (
                            <span className="ml-1 text-red-600 font-medium">
                              {liveDetectedIssues
                                .map((i) => RISK_ISSUE_LABELS[i])
                                .join('、')}
                            </span>
                          ) : (
                            <span className="ml-1 text-green-600 font-medium">
                              无（许可证/超时/人员证照均正常）
                            </span>
                          )}
                          <span className="block text-[11px] text-slate-500 mt-1">
                            保存时将自动写入问题标识，日报重点关注区会同步高亮
                          </span>
                        </div>
                      )}
                    </div>
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
