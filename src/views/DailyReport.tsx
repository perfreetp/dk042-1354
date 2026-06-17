import React, { useMemo } from 'react'
import { useStore } from '@/store'
import {
  WORK_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_STATUS_LABELS,
  RISK_ISSUE_LABELS,
  type RiskRecord,
  type RiskStatus,
  type RiskLevel,
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

const levelColors: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
}

const levelDotColors: Record<RiskLevel, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

const DailyReport: React.FC = () => {
  const {
    risks,
    airlines,
    bases,
    contracts,
    selectedDate,
    setCurrentView,
    setSelectedRiskId,
  } = useStore()

  const dayRisks = useMemo(() => {
    return risks.filter((r) => r.date === selectedDate)
  }, [risks, selectedDate])

  const groupedRisks = useMemo(() => {
    const groups: Record<RiskStatus, RiskRecord[]> = {
      not_started: [],
      in_progress: [],
      closed: [],
    }
    dayRisks.forEach((r) => {
      groups[r.status].push(r)
    })
    // 按风险等级和问题数量排序
    const levelOrder: Record<RiskLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    }
    STATUSES.forEach((s) => {
      groups[s].sort((a, b) => {
        if (b.issues.length !== a.issues.length) {
          return b.issues.length - a.issues.length
        }
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
      (r) => r.needClientSafety && !r.clientSafetyNotified
    ).length
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
      criticalHigh,
      closedOnTime,
    }
  }, [dayRisks])

  const getAirlineName = (id: string) =>
    airlines.find((a) => a.id === id)?.name || '-'
  const getBaseName = (id: string) =>
    bases.find((b) => b.id === id)?.name || '-'
  const getContractCode = (id: string) =>
    contracts.find((c) => c.id === id)?.code || '-'

  const handleViewRisk = (riskId: string) => {
    setSelectedRiskId(riskId)
    setCurrentView('fill')
  }

  const formatTime = (iso?: string) => {
    if (!iso) return '-'
    try {
      return format(parseISO(iso), 'HH:mm', { locale: zhCN })
    } catch {
      return iso
    }
  }

  return (
    <div className="h-full flex flex-col p-5 gap-5">
      {/* 顶部标题和摘要 */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>📊</span>
              现场风险日报
              <span className="text-base font-normal text-slate-500 ml-2">
                {selectedDate}
              </span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              用于每日协调会汇报：风险在哪里、谁负责、何时关闭
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>生成时间：{format(new Date(), 'yyyy-MM-dd HH:mm', { locale: zhCN })}</div>
            <div className="mt-0.5">MRO 承包商项目经理</div>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3 mt-5">
          <SummaryCard
            label="风险总数"
            value={summary.total}
            icon="📋"
            color="bg-blue-500"
          />
          <SummaryCard
            label="重大/高风险"
            value={summary.criticalHigh}
            icon="🔴"
            color="bg-red-500"
            highlight={summary.criticalHigh > 0}
          />
          <SummaryCard
            label="存在问题"
            value={summary.issuesCount}
            icon="⚠️"
            color="bg-orange-500"
            highlight={summary.issuesCount > 0}
          />
          <SummaryCard
            label="需客户安全员"
            value={summary.needClient}
            icon="👮"
            color="bg-purple-500"
          />
          <SummaryCard
            label="未通知客户"
            value={summary.notNotified}
            icon="📢"
            color="bg-amber-500"
            highlight={summary.notNotified > 0}
          />
          <SummaryCard
            label="按时关闭"
            value={summary.closedOnTime}
            icon="✅"
            color="bg-green-500"
          />
        </div>
      </div>

      {/* 重点关注问题区 */}
      {dayRisks.filter((r) => r.issues.length > 0).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
            <span>🚨</span>
            重点关注问题
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {dayRisks
              .filter((r) => r.issues.length > 0)
              .map((risk) => (
                <div
                  key={risk.id}
                  onClick={() => handleViewRisk(risk.id)}
                  className="bg-white border border-red-200 rounded-md p-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${levelDotColors[risk.riskLevel]}`}
                        />
                        <span className="font-semibold text-slate-800 text-sm">
                          {WORK_TYPE_LABELS[risk.workType]}
                        </span>
                        <span className="text-xs text-slate-500">
                          · {risk.team}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        {risk.location}
                        {risk.aircraftReg && (
                          <span className="ml-1 font-mono">
                            ({risk.aircraftReg})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      预计 {formatTime(risk.estimatedEndTime)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {risk.issues.map((issue) => (
                      <span
                        key={issue}
                        className="inline-block px-2 py-0.5 text-[11px] font-medium bg-red-100 text-red-700 border border-red-200 rounded"
                      >
                        {RISK_ISSUE_LABELS[issue]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 三列看板 */}
      <div className="flex-1 grid grid-cols-3 gap-5 min-h-0">
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
                    airlineName={getAirlineName(risk.airlineId)}
                    baseName={getBaseName(risk.baseId)}
                    contractCode={getContractCode(risk.contractId)}
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
  icon: string
  color: string
  highlight?: boolean
}> = ({ label, value, icon, color, highlight }) => (
  <div
    className={`rounded-lg p-3 border transition-colors ${
      highlight
        ? 'bg-red-50 border-red-200'
        : 'bg-slate-50 border-slate-200'
    }`}
  >
    <div className="flex items-center gap-2">
      <div
        className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center text-base`}
      >
        {icon}
      </div>
      <div>
        <div
          className={`text-xl font-bold ${
            highlight ? 'text-red-700' : 'text-slate-800'
          }`}
        >
          {value}
        </div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  </div>
)

const RiskCard: React.FC<{
  risk: RiskRecord
  airlineName: string
  baseName: string
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
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${levelDotColors[risk.riskLevel]}`}
          />
          <span className="font-semibold text-sm text-slate-800 truncate">
            {WORK_TYPE_LABELS[risk.workType]}
          </span>
        </div>
        <span
          className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded border flex-shrink-0 ml-2 ${
            levelColors[risk.riskLevel]
          }`}
        >
          {RISK_LEVEL_LABELS[risk.riskLevel]}
        </span>
      </div>

      {/* 风险描述 */}
      <p className="text-xs text-slate-600 line-clamp-2 mb-2 min-h-[32px]">
        {risk.description}
      </p>

      {/* 详细信息 */}
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
          <span className="text-slate-400">
            · {risk.workers.map((w) => w.name).join('、') || '未指派'}
          </span>
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
          <span>
            预计 {formatTime(risk.estimatedEndTime)}
          </span>
          {risk.status === 'closed' && risk.actualEndTime && (
            <span className="text-green-600">
              · 实际 {formatTime(risk.actualEndTime)}
            </span>
          )}
        </div>
      </div>

      {/* 问题标签 */}
      {hasIssues && (
        <div className="flex flex-wrap gap-1 mb-2">
          {risk.issues.map((issue) => (
            <span
              key={issue}
              className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 rounded"
            >
              ⚠ {RISK_ISSUE_LABELS[issue]}
            </span>
          ))}
        </div>
      )}

      {/* 客户安全员 */}
      {risk.needClientSafety && (
        <div
          className={`text-[10px] px-2 py-1 rounded flex items-center gap-1 ${
            risk.clientSafetyNotified
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          <span>👮</span>
          <span>
            需客户安全员
            {risk.clientSafetyNotified ? '（已通知）' : '（未通知！）'}
          </span>
        </div>
      )}
    </div>
  )
}

export default DailyReport
