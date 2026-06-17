import React, { useMemo } from 'react'
import { useStore } from '@/store'
import {
  WORK_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_STATUS_LABELS,
  RISK_ISSUE_LABELS,
  CLIENT_SAFETY_STATUS_LABELS,
  type RiskRecord,
  type RiskStatus,
  type RiskLevel,
  type ClientSafetyStatus,
} from '@/types'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const STATUSES: RiskStatus[] = ['not_started', 'in_progress', 'closed']

const statusColors: Record<RiskStatus, string> = {
  not_started: 'bg-slate-500',
  in_progress: 'bg-amber-500',
  closed: 'bg-green-500',
}

const statusBgColors: Record<RiskStatus, string> = {
  not_started: 'bg-slate-50 border-slate-200',
  in_progress: 'bg-amber-50 border-amber-200',
  closed: 'bg-green-50 border-green-200',
}

const levelDotColors: Record<RiskLevel, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

const clientStatusColors: Record<ClientSafetyStatus, string> = {
  not_required: 'bg-slate-100 text-slate-600 border-slate-200',
  pending_notify: 'bg-amber-100 text-amber-700 border-amber-200',
  notified: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  absent: 'bg-red-100 text-red-700 border-red-200',
}

const DailyReport: React.FC = () => {
  const {
    airlines,
    bases,
    contracts,
    selectedDate,
    selectedAirlineId,
    selectedBaseId,
    selectedContractId,
    setCurrentView,
    setSelectedRiskId,
    getFilteredRisks,
  } = useStore()

  const dayRisks = getFilteredRisks()

  const groupedRisks = useMemo(() => {
    const groups: Record<RiskStatus, RiskRecord[]> = {
      not_started: [],
      in_progress: [],
      closed: [],
    }
    dayRisks.forEach((r) => {
      groups[r.status].push(r)
    })
    const levelOrder: Record<RiskLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    }
    STATUSES.forEach((s) => {
      groups[s].sort((a, b) => {
        if (b.issues.length !== a.issues.length) return b.issues.length - a.issues.length
        // 客户安全员未闭合优先
        const aOpen = a.needClientSafety && a.clientSafetyStatus !== 'confirmed' ? 1 : 0
        const bOpen = b.needClientSafety && b.clientSafetyStatus !== 'confirmed' ? 1 : 0
        if (bOpen !== aOpen) return bOpen - aOpen
        return levelOrder[a.riskLevel] - levelOrder[b.riskLevel]
      })
    })
    return groups
  }, [dayRisks])

  const summary = useMemo(() => {
    const total = dayRisks.length
    const issuesCount = dayRisks.filter((r) => r.issues.length > 0).length
    const needClient = dayRisks.filter((r) => r.needClientSafety).length
    const notNotified = dayRisks.filter(
      (r) => r.needClientSafety && r.clientSafetyStatus === 'pending_notify'
    ).length
    const notified = dayRisks.filter(
      (r) => r.needClientSafety && r.clientSafetyStatus === 'notified'
    ).length
    const confirmed = dayRisks.filter(
      (r) => r.needClientSafety && r.clientSafetyStatus === 'confirmed'
    ).length
    const absent = dayRisks.filter(
      (r) => r.needClientSafety && r.clientSafetyStatus === 'absent'
    ).length
    const clientUnclosed = needClient - confirmed
    const criticalHigh = dayRisks.filter(
      (r) => r.riskLevel === 'critical' || r.riskLevel === 'high'
    ).length
    const closedOnTime = dayRisks.filter(
      (r) =>
        r.status === 'closed' &&
        r.actualEndTime &&
        r.estimatedEndTime &&
        parseISO(r.actualEndTime) <= parseISO(r.estimatedEndTime)
    ).length
    return {
      total,
      issuesCount,
      needClient,
      notNotified,
      notified,
      confirmed,
      absent,
      clientUnclosed,
      criticalHigh,
      closedOnTime,
    }
  }, [dayRisks])

  const filterSummary = useMemo(() => {
    const parts: string[] = []
    if (selectedAirlineId) {
      parts.push(airlines.find((a) => a.id === selectedAirlineId)?.name || '')
    } else {
      parts.push('全部航司')
    }
    if (selectedBaseId) {
      parts.push(bases.find((b) => b.id === selectedBaseId)?.name || '')
    } else {
      parts.push('全部基地')
    }
    if (selectedContractId) {
      parts.push(contracts.find((c) => c.id === selectedContractId)?.code || '')
    } else {
      parts.push('全部合同')
    }
    return parts.join(' · ')
  }, [selectedAirlineId, selectedBaseId, selectedContractId, airlines, bases, contracts])

  const handleViewRisk = (riskId: string) => {
    setSelectedRiskId(riskId)
    setCurrentView('fill')
  }

  const handleGoProject = () => setCurrentView('project')
  const handleGoPrint = () => setCurrentView('report-print')

  const formatTime = (iso?: string) => {
    if (!iso) return '-'
    try {
      return format(parseISO(iso), 'HH:mm', { locale: zhCN })
    } catch {
      return iso
    }
  }
  const formatDT = (iso?: string) => {
    if (!iso) return '-'
    try {
      return format(parseISO(iso), 'MM-dd HH:mm', { locale: zhCN })
    } catch {
      return iso
    }
  }

  const issueRisks = dayRisks.filter((r) => r.issues.length > 0)
  const clientRisks = dayRisks.filter((r) => r.needClientSafety)
  const clientUnclosedRisks = clientRisks.filter(
    (r) => r.clientSafetyStatus !== 'confirmed'
  )

  return (
    <div className="h-full flex flex-col p-5 gap-5 overflow-auto">
      {/* 顶部标题和摘要 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>📊</span>
                现场风险日报
                <span className="text-base font-normal text-slate-500 ml-1">
                  {selectedDate}
                </span>
              </h2>
              <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                {filterSummary}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              用于每日协调会汇报：风险在哪里、谁负责、何时关闭
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-slate-400">
              生成时间：
              {format(new Date(), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGoProject}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
              >
                ← 返回项目筛选
              </button>
              <button
                onClick={handleGoPrint}
                className="px-3 py-1.5 bg-mro-blue hover:bg-mro-blue-light text-white text-xs font-medium rounded-md transition-colors shadow-sm"
              >
                🖨️ 协调会汇报版
              </button>
            </div>
          </div>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-8 gap-3 mt-5">
          <SummaryCard label="风险总数" value={summary.total} color="bg-blue-500" />
          <SummaryCard
            label="重大/高风险"
            value={summary.criticalHigh}
            color="bg-red-500"
            highlight={summary.criticalHigh > 0}
          />
          <SummaryCard
            label="存在问题"
            value={summary.issuesCount}
            color="bg-orange-500"
            highlight={summary.issuesCount > 0}
          />
          <SummaryCard label="已关闭" value={groupedRisks.closed.length} color="bg-green-500" />
          <SummaryCard
            label="按时关闭"
            value={summary.closedOnTime}
            color="bg-emerald-500"
          />
          <SummaryCard
            label="需客户安全员"
            value={summary.needClient}
            color="bg-purple-500"
          />
          <SummaryCard
            label="待通知/未到场"
            value={summary.notNotified + summary.absent}
            color="bg-rose-500"
            highlight={summary.notNotified + summary.absent > 0}
          />
          <SummaryCard
            label="已到场确认"
            value={summary.confirmed}
            color="bg-teal-500"
          />
        </div>

        {/* 客户安全员到场合规情况条 */}
        {summary.needClient > 0 && (
          <div className="mt-4 p-3 bg-slate-50 rounded-md border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600">
                👮 客户安全员到场闭环进度
              </span>
              <span className="text-xs text-slate-500">
                {summary.confirmed}/{summary.needClient} 已确认
                {summary.absent > 0 && <span className="ml-2 text-red-600">· {summary.absent} 未到场</span>}
                {summary.notNotified > 0 && (
                  <span className="ml-2 text-amber-600">· {summary.notNotified} 待通知</span>
                )}
                {summary.notified > 0 && (
                  <span className="ml-2 text-blue-600">· {summary.notified} 已通知待确认</span>
                )}
              </span>
            </div>
            <div className="h-2.5 bg-white rounded-full overflow-hidden flex border border-slate-200">
              {summary.confirmed > 0 && (
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(summary.confirmed / summary.needClient) * 100}%` }}
                  title={`已到场 ${summary.confirmed}`}
                />
              )}
              {summary.notified > 0 && (
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(summary.notified / summary.needClient) * 100}%` }}
                  title={`已通知待确认 ${summary.notified}`}
                />
              )}
              {summary.notNotified > 0 && (
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${(summary.notNotified / summary.needClient) * 100}%` }}
                  title={`待通知 ${summary.notNotified}`}
                />
              )}
              {summary.absent > 0 && (
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(summary.absent / summary.needClient) * 100}%` }}
                  title={`未到场 ${summary.absent}`}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 重点关注问题区 */}
      {issueRisks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              <span>🚨</span>
              重点关注问题
              <span className="text-xs font-normal text-red-600">
                （共 {issueRisks.length} 项，点击卡片可跳转处理）
              </span>
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {issueRisks.map((risk) => (
              <div
                key={risk.id}
                onClick={() => handleViewRisk(risk.id)}
                className="bg-white border border-red-200 rounded-md p-3 cursor-pointer hover:shadow-md transition-all hover:border-red-400"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${levelDotColors[risk.riskLevel]}`}
                      />
                      <span className="font-semibold text-slate-800 text-sm">
                        {WORK_TYPE_LABELS[risk.workType]}
                      </span>
                      <span className="text-xs text-slate-500">
                        · {risk.team}
                      </span>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded border ${
                          risk.status === 'closed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : risk.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {RISK_STATUS_LABELS[risk.status]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      📍 {risk.location}
                      {risk.aircraftReg && (
                        <span className="ml-1 font-mono text-slate-700">
                          ({risk.aircraftReg})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-400">预计</div>
                    <div className="text-xs font-mono text-slate-600">
                      {formatTime(risk.estimatedEndTime)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {risk.issues.map((issue) => (
                    <span
                      key={issue}
                      className="inline-block px-2 py-0.5 text-[11px] font-medium bg-red-100 text-red-700 border border-red-200 rounded"
                    >
                      ⚠️ {RISK_ISSUE_LABELS[issue]}
                    </span>
                  ))}
                </div>
                {risk.needClientSafety && (
                  <div
                    className={`mt-2 text-[11px] px-2 py-1 rounded flex items-center gap-1 border ${
                      clientStatusColors[risk.clientSafetyStatus]
                    }`}
                  >
                    👮 {CLIENT_SAFETY_STATUS_LABELS[risk.clientSafetyStatus]}
                    {risk.clientSafetyAbsentReason && (
                      <span className="truncate ml-1">
                        · {risk.clientSafetyAbsentReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 客户安全员未闭合区 */}
      {clientUnclosedRisks.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-bold text-purple-800 flex items-center gap-2 mb-3">
            <span>👮</span>
            客户安全员未闭合（协调会需重点跟踪）
            <span className="text-xs font-normal text-purple-600">
              （共 {clientUnclosedRisks.length} 项）
            </span>
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-purple-700 border-b border-purple-200">
                <th className="py-2 pr-3 font-medium">作业</th>
                <th className="py-2 pr-3 font-medium">班组/位置</th>
                <th className="py-2 pr-3 font-medium">当前状态</th>
                <th className="py-2 pr-3 font-medium">通知时间</th>
                <th className="py-2 pr-3 font-medium">备注/原因</th>
              </tr>
            </thead>
            <tbody>
              {clientUnclosedRisks.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => handleViewRisk(r.id)}
                  className="border-b border-purple-100 last:border-0 cursor-pointer hover:bg-white transition-colors"
                >
                  <td className="py-2 pr-3 text-slate-800 font-medium">
                    {WORK_TYPE_LABELS[r.workType]}
                    <span className="ml-1 text-slate-400 font-normal">
                      · {RISK_LEVEL_LABELS[r.riskLevel]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-700">
                    <div>{r.team}</div>
                    <div className="text-slate-500">{r.location}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded border ${
                        clientStatusColors[r.clientSafetyStatus]
                      }`}
                    >
                      {CLIENT_SAFETY_STATUS_LABELS[r.clientSafetyStatus]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-700 font-mono">
                    {formatDT(r.clientSafetyNotifyTime)}
                  </td>
                  <td className="py-2 pr-3 text-slate-600 max-w-xs truncate">
                    {r.clientSafetyAbsentReason ||
                      (r.clientSafetyStatus === 'pending_notify'
                        ? '尚未通知客户'
                        : r.clientSafetyStatus === 'notified'
                        ? '等待客户到场'
                        : '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 三列看板 */}
      <div className="grid grid-cols-3 gap-5 flex-1 min-h-[500px]">
        {STATUSES.map((status) => (
          <div
            key={status}
            className={`flex flex-col rounded-lg border-2 overflow-hidden ${statusBgColors[status]}`}
          >
            {/* 列头 */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                <h3 className="font-bold text-slate-800">
                  {RISK_STATUS_LABELS[status]}
                </h3>
              </div>
              <span className="bg-white px-2.5 py-0.5 rounded-full text-sm font-semibold text-slate-700 shadow-sm">
                {groupedRisks[status].length}
              </span>
            </div>

            {/* 卡片列表 */}
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {groupedRisks[status].length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8">
                  暂无记录
                </div>
              ) : (
                groupedRisks[status].map((risk) => (
                  <RiskCard
                    key={risk.id}
                    risk={risk}
                    contractCode={
                      contracts.find((c) => c.id === risk.contractId)?.code || ''
                    }
                    formatTime={formatTime}
                    onClick={() => handleViewRisk(risk.id)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SummaryCard: React.FC<{
  label: string
  value: number
  color: string
  highlight?: boolean
}> = ({ label, value, color, highlight }) => (
  <div
    className={`rounded-lg p-3 border transition-colors ${
      highlight ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'
    }`}
  >
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-md ${color} flex items-center justify-center text-sm font-bold text-white ${
          highlight ? 'animate-pulse' : ''
        }`}
      >
        {value}
      </div>
      <div
        className={`text-[11px] leading-tight ${
          highlight ? 'text-red-700 font-medium' : 'text-slate-600'
        }`}
      >
        {label}
      </div>
    </div>
  </div>
)

const RiskCard: React.FC<{
  risk: RiskRecord
  contractCode: string
  formatTime: (iso?: string) => string
  onClick: () => void
}> = ({ risk, contractCode, formatTime, onClick }) => {
  const hasIssues = risk.issues.length > 0

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-md shadow-sm p-3 cursor-pointer transition-all hover:shadow-md border ${
        hasIssues ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${levelDotColors[risk.riskLevel]}`}
          />
          <span className="font-semibold text-sm text-slate-800 truncate">
            {WORK_TYPE_LABELS[risk.workType]}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border ${
              risk.riskLevel === 'critical'
                ? 'bg-red-100 text-red-700 border-red-200'
                : risk.riskLevel === 'high'
                ? 'bg-orange-100 text-orange-700 border-orange-200'
                : risk.riskLevel === 'medium'
                ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                : 'bg-green-100 text-green-700 border-green-200'
            }`}
          >
            {RISK_LEVEL_LABELS[risk.riskLevel]}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 line-clamp-2 mb-2 min-h-[32px]">
        {risk.description}
      </p>

      <div className="space-y-1 text-[11px] text-slate-500 mb-2">
        <div className="flex items-center gap-1">
          <span>📍</span>
          <span className="truncate">{risk.location}</span>
          {risk.aircraftReg && (
            <span className="font-mono text-slate-600 flex-shrink-0">
              · {risk.aircraftReg}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span>👥</span>
          <span>{risk.team}</span>
          {risk.workers.length > 0 && (
            <span className="text-slate-400">
              · {risk.workers.map((w) => w.name).join('、')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span>📄</span>
          <span className="font-mono text-slate-600">{contractCode}</span>
        </div>
        {risk.permitNumber && (
          <div className="flex items-center gap-1">
            <span>🎫</span>
            <span className="font-mono">{risk.permitNumber}</span>
            {risk.permitExpiry && (
              <span className="text-slate-400">
                · 至 {formatTime(risk.permitExpiry)}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1">
          <span>⏰</span>
          <span>预计 {formatTime(risk.estimatedEndTime)}</span>
          {risk.status === 'closed' && risk.actualEndTime && (
            <span className="text-green-600">
              · 实际 {formatTime(risk.actualEndTime)}
            </span>
          )}
        </div>
      </div>

      {hasIssues && (
        <div className="flex flex-wrap gap-1 mb-2">
          {risk.issues.slice(0, 3).map((issue) => (
            <span
              key={issue}
              title={RISK_ISSUE_LABELS[issue]}
              className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded"
            >
              ⚠ {RISK_ISSUE_LABELS[issue].replace('许可证即将过期(24h内)', '证临期')}
            </span>
          ))}
          {risk.issues.length > 3 && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
              +{risk.issues.length - 3}
            </span>
          )}
        </div>
      )}

      {risk.needClientSafety && (
        <div
          className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 border ${
            clientStatusColors[risk.clientSafetyStatus]
          }`}
        >
          <span>👮</span>
          <span className="truncate">
            {CLIENT_SAFETY_STATUS_LABELS[risk.clientSafetyStatus]}
          </span>
        </div>
      )}
    </div>
  )
}

export default DailyReport
