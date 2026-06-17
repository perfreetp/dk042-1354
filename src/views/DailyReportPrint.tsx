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
  type ClientSafetyStatus,
} from '@/types'
import { format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const STATUSES: RiskStatus[] = ['not_started', 'in_progress', 'closed']

const clientStatusBg: Record<ClientSafetyStatus, string> = {
  not_required: 'bg-slate-100 text-slate-600 border-slate-200',
  pending_notify: 'bg-amber-50 text-amber-700 border-amber-200',
  notified: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
}

const DailyReportPrint: React.FC = () => {
  const {
    airlines,
    bases,
    contracts,
    selectedDate,
    selectedAirlineId,
    selectedBaseId,
    selectedContractId,
    setCurrentView,
    getFilteredRisks,
  } = useStore()

  const risks = getFilteredRisks()

  const groupedRisks = useMemo(() => {
    const g: Record<RiskStatus, RiskRecord[]> = {
      not_started: [],
      in_progress: [],
      closed: [],
    }
    risks.forEach((r) => g[r.status].push(r))
    return g
  }, [risks])

  const issueRisks = risks.filter((r) => r.issues.length > 0)
  const clientRisks = risks.filter((r) => r.needClientSafety)
  const clientUnclosed = clientRisks.filter((r) => r.clientSafetyStatus !== 'confirmed')

  const filterSummary = useMemo(() => {
    const parts: string[] = []
    const airline = airlines.find((a) => a.id === selectedAirlineId)
    const base = bases.find((b) => b.id === selectedBaseId)
    const contract = contracts.find((c) => c.id === selectedContractId)
    parts.push(`客户航司：${airline ? `${airline.code} ${airline.name}` : '全部'}`)
    parts.push(`维修基地：${base ? `${base.code} ${base.name}` : '全部'}`)
    parts.push(`合同项目：${contract ? contract.code : '全部'}`)
    parts.push(`作业日期：${selectedDate}`)
    return parts
  }, [selectedAirlineId, selectedBaseId, selectedContractId, selectedDate, airlines, bases, contracts])

  const formatDT = (iso?: string) => {
    if (!iso) return '-'
    try {
      return format(parseISO(iso), 'MM-dd HH:mm', { locale: zhCN })
    } catch {
      return iso
    }
  }
  const formatTime = (iso?: string) => {
    if (!iso) return '-'
    try {
      return format(parseISO(iso), 'HH:mm', { locale: zhCN })
    } catch {
      return iso
    }
  }

  const stats = useMemo(() => {
    const total = risks.length
    const issues = issueRisks.length
    const criticalHigh = risks.filter(
      (r) => r.riskLevel === 'critical' || r.riskLevel === 'high'
    ).length
    const notStarted = groupedRisks.not_started.length
    const inProgress = groupedRisks.in_progress.length
    const closed = groupedRisks.closed.length
    const needClient = clientRisks.length
    const clientConfirmed = clientRisks.filter((r) => r.clientSafetyStatus === 'confirmed').length
    return {
      total,
      issues,
      criticalHigh,
      notStarted,
      inProgress,
      closed,
      needClient,
      clientConfirmed,
      clientUnclosed: clientUnclosed.length,
    }
  }, [risks, issueRisks, groupedRisks, clientRisks, clientUnclosed.length])

  const handlePrint = () => window.print()
  const handleBack = () => setCurrentView('report')
  const handleExportCsv = () => {
    const rows = [
      [
        '作业类型',
        '风险等级',
        '作业位置',
        '飞机注册号',
        '作业班组',
        '作业状态',
        '合同',
        '预计结束',
        '客户安全员状态',
        '问题项',
        '风险描述',
      ],
      ...risks.map((r) => [
        WORK_TYPE_LABELS[r.workType],
        RISK_LEVEL_LABELS[r.riskLevel],
        r.location,
        r.aircraftReg || '',
        r.team,
        RISK_STATUS_LABELS[r.status],
        contracts.find((c) => c.id === r.contractId)?.code || '',
        formatDT(r.estimatedEndTime),
        r.needClientSafety
          ? CLIENT_SAFETY_STATUS_LABELS[r.clientSafetyStatus]
          : '无需',
        r.issues.map((i) => RISK_ISSUE_LABELS[i]).join('|'),
        r.description.replace(/\r?\n/g, ' '),
      ]),
    ]
    const csv =
      '\uFEFF' +
      rows
        .map((row) =>
          row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
        )
        .join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `现场风险日报_${selectedDate}.csv`
    a.click()
  }

  return (
    <div className="w-full min-h-screen bg-slate-100 print:bg-white">
      {/* 工具栏（打印时隐藏） */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
          >
            ← 返回看板视图
          </button>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>📄</span>
            协调会汇报版（可打印/导出）
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded transition-colors shadow-sm"
          >
            📥 导出 CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-mro-blue hover:bg-mro-blue-light text-white text-xs font-medium rounded transition-colors shadow-sm"
          >
            🖨️ 打印
          </button>
        </div>
      </div>

      {/* 打印内容 */}
      <div className="max-w-5xl mx-auto my-6 print:my-0 print:max-w-none p-6 bg-white print:p-0 shadow-md print:shadow-none border border-slate-200 print:border-0">
        {/* 页眉 */}
        <header className="border-b-2 border-mro-blue pb-4 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-mro-blue tracking-wide">
                ✈️ 民航维修现场风险日报
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                MRO Site Risk Daily Report
              </p>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-0.5">
              <div>
                生成时间：
                <span className="font-mono">
                  {format(new Date(), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </span>
              </div>
              <div>版本：V2.0</div>
            </div>
          </div>
          {/* 项目筛选条件 */}
          <div className="mt-4 bg-slate-50 p-3 rounded-md border border-slate-200 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {filterSummary.map((line, i) => (
              <div key={i} className="flex items-center">
                <span className="text-slate-500 w-20 flex-shrink-0">{line.split('：')[0]}：</span>
                <span className="text-slate-800 font-medium">{line.split('：').slice(1).join('：')}</span>
              </div>
            ))}
          </div>
        </header>

        {/* 数据摘要 */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-slate-800 mb-2 border-l-4 border-mro-blue pl-2">
            一、数据摘要
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700">
                <th className="border border-slate-200 px-2 py-1.5">风险总数</th>
                <th className="border border-slate-200 px-2 py-1.5">重大/高风险</th>
                <th className="border border-slate-200 px-2 py-1.5">存在问题</th>
                <th className="border border-slate-200 px-2 py-1.5">未开工</th>
                <th className="border border-slate-200 px-2 py-1.5">进行中</th>
                <th className="border border-slate-200 px-2 py-1.5">已关闭</th>
                <th className="border border-slate-200 px-2 py-1.5">需客户安全员</th>
                <th className="border border-slate-200 px-2 py-1.5">已到场确认</th>
                <th className="border border-slate-200 px-2 py-1.5">未闭合</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-center text-slate-800 font-medium">
                <td className="border border-slate-200 px-2 py-1.5">{stats.total}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-red-700">
                  {stats.criticalHigh}
                </td>
                <td className="border border-slate-200 px-2 py-1.5 text-orange-700">
                  {stats.issues}
                </td>
                <td className="border border-slate-200 px-2 py-1.5">{stats.notStarted}</td>
                <td className="border border-slate-200 px-2 py-1.5">{stats.inProgress}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-green-700">
                  {stats.closed}
                </td>
                <td className="border border-slate-200 px-2 py-1.5">{stats.needClient}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-green-700">
                  {stats.clientConfirmed}
                </td>
                <td className="border border-slate-200 px-2 py-1.5 text-rose-700">
                  {stats.clientUnclosed}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 重点关注问题 */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-slate-800 mb-2 border-l-4 border-red-500 pl-2">
            二、重点关注问题（共 {issueRisks.length} 项）
          </h2>
          {issueRisks.length === 0 ? (
            <div className="text-xs text-slate-500 bg-green-50 p-3 rounded border border-green-100 text-center">
              ✓ 今日暂无自动检测到的问题项
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-red-50 text-red-800">
                  <th className="border border-red-100 px-2 py-1.5 text-left">序号</th>
                  <th className="border border-red-100 px-2 py-1.5 text-left">作业类型</th>
                  <th className="border border-red-100 px-2 py-1.5 text-left">等级</th>
                  <th className="border border-red-100 px-2 py-1.5 text-left">作业位置/机号</th>
                  <th className="border border-red-100 px-2 py-1.5 text-left">班组</th>
                  <th className="border border-red-100 px-2 py-1.5 text-left">状态</th>
                  <th className="border border-red-100 px-2 py-1.5 text-left">预计结束</th>
                  <th className="border border-red-100 px-2 py-1.5 text-left">问题项</th>
                </tr>
              </thead>
              <tbody>
                {issueRisks.map((r, i) => (
                  <tr key={r.id} className="bg-red-50/20">
                    <td className="border border-slate-200 px-2 py-1.5">{i + 1}</td>
                    <td className="border border-slate-200 px-2 py-1.5 font-medium">
                      {WORK_TYPE_LABELS[r.workType]}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          r.riskLevel === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : r.riskLevel === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : r.riskLevel === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {RISK_LEVEL_LABELS[r.riskLevel]}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5">
                      {r.location}
                      {r.aircraftReg && <span className="font-mono ml-1">({r.aircraftReg})</span>}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5">{r.team}</td>
                    <td className="border border-slate-200 px-2 py-1.5">
                      {RISK_STATUS_LABELS[r.status]}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 font-mono">
                      {formatDT(r.estimatedEndTime)}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-red-700">
                      {r.issues.map((i) => RISK_ISSUE_LABELS[i]).join('；')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 客户安全员到场情况 */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-slate-800 mb-2 border-l-4 border-purple-500 pl-2">
            三、客户安全员到场情况（共 {clientRisks.length} 项需到场）
          </h2>
          {clientRisks.length === 0 ? (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200 text-center">
              今日无需要客户安全员到场的作业
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-purple-50 text-purple-800">
                  <th className="border border-purple-100 px-2 py-1.5 text-left">序号</th>
                  <th className="border border-purple-100 px-2 py-1.5 text-left">作业</th>
                  <th className="border border-purple-100 px-2 py-1.5 text-left">位置</th>
                  <th className="border border-purple-100 px-2 py-1.5 text-left">班组</th>
                  <th className="border border-purple-100 px-2 py-1.5 text-left">当前状态</th>
                  <th className="border border-purple-100 px-2 py-1.5 text-left">通知时间/人</th>
                  <th className="border border-purple-100 px-2 py-1.5 text-left">到场确认</th>
                  <th className="border border-purple-100 px-2 py-1.5 text-left">未到场原因</th>
                </tr>
              </thead>
              <tbody>
                {clientRisks.map((r, i) => (
                  <tr key={r.id}>
                    <td className="border border-slate-200 px-2 py-1.5">{i + 1}</td>
                    <td className="border border-slate-200 px-2 py-1.5 font-medium">
                      {WORK_TYPE_LABELS[r.workType]}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5">{r.location}</td>
                    <td className="border border-slate-200 px-2 py-1.5">{r.team}</td>
                    <td className="border border-slate-200 px-2 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${clientStatusBg[r.clientSafetyStatus]}`}>
                        {CLIENT_SAFETY_STATUS_LABELS[r.clientSafetyStatus]}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 font-mono">
                      {r.clientSafetyNotifyTime
                        ? `${formatDT(r.clientSafetyNotifyTime)}`
                        : '-'}
                      <div className="text-slate-500">
                        {r.clientSafetyNotifyPerson || ''}
                      </div>
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 font-mono">
                      {r.clientSafetyConfirmTime
                        ? formatDT(r.clientSafetyConfirmTime)
                        : '-'}
                      <div className="text-slate-500">
                        {r.clientSafetyConfirmPerson || ''}
                      </div>
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-slate-700 max-w-[180px]">
                      {r.clientSafetyAbsentReason ||
                        (r.clientSafetyStatus === 'notified' ? '待到场' : r.clientSafetyStatus === 'pending_notify' ? '待通知' : '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 分状态详细列表 */}
        {STATUSES.map((status) => (
          <section key={status} className="mb-6">
            <h2 className="text-sm font-bold text-slate-800 mb-2 border-l-4 border-slate-500 pl-2 flex items-center gap-2">
              四{STATUSES.indexOf(status) === 0 ? '' : STATUSES.indexOf(status) === 1 ? '' : ''}、
              {status === 'not_started'
                ? '未开工作业'
                : status === 'in_progress'
                ? '进行中作业'
                : '已关闭作业'}
              <span className="text-xs font-normal text-slate-500">
                （{RISK_STATUS_LABELS[status]} 共 {groupedRisks[status].length} 项）
              </span>
            </h2>
            {groupedRisks[status].length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200 text-center">
                暂无
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700">
                    <th className="border border-slate-200 px-2 py-1.5 text-left w-8">#</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left">作业类型</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left w-16">等级</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left">作业位置</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left w-16">机号</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left w-16">班组</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left w-20">人员</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left w-24">许可证</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left w-20">预计结束</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left">风险描述</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left w-16">安全员</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRisks[status].map((r, i) => (
                    <tr
                      key={r.id}
                      className={r.issues.length > 0 ? 'bg-red-50/30' : ''}
                    >
                      <td className="border border-slate-200 px-2 py-1.5 text-slate-500">
                        {i + 1}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 font-medium">
                        {WORK_TYPE_LABELS[r.workType]}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        <span
                          className={`px-1 py-0.5 rounded text-[10px] ${
                            r.riskLevel === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : r.riskLevel === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : r.riskLevel === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {RISK_LEVEL_LABELS[r.riskLevel]}
                        </span>
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">{r.location}</td>
                      <td className="border border-slate-200 px-2 py-1.5 font-mono">
                        {r.aircraftReg || '-'}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">{r.team}</td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        {r.workers.map((w) => w.name).join('、') || '-'}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 font-mono text-[10px]">
                        {r.permitNumber ? (
                          <>
                            <div>{r.permitNumber}</div>
                            {r.permitExpiry && (
                              <div className="text-slate-500">至{formatTime(r.permitExpiry)}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-red-600">未填</span>
                        )}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 font-mono">
                        {formatDT(r.estimatedEndTime)}
                        {status === 'closed' && r.actualEndTime && (
                          <div className="text-green-700">实:{formatTime(r.actualEndTime)}</div>
                        )}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 max-w-[240px]">
                        <div className="line-clamp-2">{r.description}</div>
                        {r.issues.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {r.issues.slice(0, 2).map((iss) => (
                              <span
                                key={iss}
                                className="text-[9px] px-1 py-0.5 bg-red-100 text-red-700 rounded"
                              >
                                ⚠{RISK_ISSUE_LABELS[iss].replace('许可证即将过期(24h内)', '证临期')}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5">
                        {r.needClientSafety ? (
                          <span
                            className={`px-1 py-0.5 rounded text-[9px] font-medium border block text-center ${clientStatusBg[r.clientSafetyStatus]}`}
                          >
                            {CLIENT_SAFETY_STATUS_LABELS[r.clientSafetyStatus]}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">无需</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

        {/* 页脚签名区 */}
        <footer className="mt-10 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-3 gap-6 text-xs text-slate-600">
            <div>
              <div className="mb-8">承包商项目经理签字：____________________</div>
              <div>日期：__________</div>
            </div>
            <div>
              <div className="mb-8">客户方代表签字：____________________</div>
              <div>日期：__________</div>
            </div>
            <div>
              <div className="mb-8">备注：</div>
              <div className="h-16 border border-slate-200 rounded p-1 text-slate-400">
                （协调会重要结论与后续行动项）
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* 打印样式 */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm 8mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}

export default DailyReportPrint
