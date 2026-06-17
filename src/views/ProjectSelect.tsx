import React, { useMemo } from 'react'
import { useStore } from '@/store'
import {
  WORK_TYPE_LABELS,
  RISK_LEVEL_LABELS,
  RISK_STATUS_LABELS,
} from '@/types'
import type { RiskLevel } from '@/types'

const levelColors: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
}

const ProjectSelect: React.FC = () => {
  const {
    airlines,
    bases,
    contracts,
    risks,
    selectedAirlineId,
    selectedBaseId,
    selectedContractId,
    selectedDate,
    setSelectedAirlineId,
    setSelectedBaseId,
    setSelectedContractId,
    setSelectedDate,
    setCurrentView,
    setSelectedRiskId,
  } = useStore()

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (selectedAirlineId && c.airlineId !== selectedAirlineId) return false
      if (selectedBaseId && c.baseId !== selectedBaseId) return false
      return true
    })
  }, [contracts, selectedAirlineId, selectedBaseId])

  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (r.date !== selectedDate) return false
      if (selectedAirlineId && r.airlineId !== selectedAirlineId) return false
      if (selectedBaseId && r.baseId !== selectedBaseId) return false
      if (selectedContractId && r.contractId !== selectedContractId) return false
      return true
    })
  }, [risks, selectedDate, selectedAirlineId, selectedBaseId, selectedContractId])

  const stats = useMemo(() => {
    return {
      total: filteredRisks.length,
      notStarted: filteredRisks.filter((r) => r.status === 'not_started').length,
      inProgress: filteredRisks.filter((r) => r.status === 'in_progress').length,
      closed: filteredRisks.filter((r) => r.status === 'closed').length,
      withIssues: filteredRisks.filter((r) => r.issues.length > 0).length,
      needClient: filteredRisks.filter((r) => r.needClientSafety).length,
    }
  }, [filteredRisks])

  const handleViewRisk = (riskId: string) => {
    setSelectedRiskId(riskId)
    setCurrentView('fill')
  }

  const getAirlineName = (id: string) =>
    airlines.find((a) => a.id === id)?.name || '-'

  const getBaseName = (id: string) =>
    bases.find((b) => b.id === id)?.name || '-'

  const getContractCode = (id: string) =>
    contracts.find((c) => c.id === id)?.code || '-'

  return (
    <div className="h-full flex flex-col p-6 gap-5">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span>🔍</span>
          筛选条件
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              客户航司
            </label>
            <select
              value={selectedAirlineId || ''}
              onChange={(e) => setSelectedAirlineId(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue focus:border-mro-blue"
            >
              <option value="">全部航司</option>
              {airlines.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              维修基地
            </label>
            <select
              value={selectedBaseId || ''}
              onChange={(e) => setSelectedBaseId(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue focus:border-mro-blue"
            >
              <option value="">全部基地</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              合同项目
            </label>
            <select
              value={selectedContractId || ''}
              onChange={(e) => setSelectedContractId(e.target.value || null)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue focus:border-mro-blue"
            >
              <option value="">全部合同</option>
              {filteredContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              作业日期
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-mro-blue focus:border-mro-blue"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <StatCard label="风险总数" value={stats.total} color="bg-blue-500" />
        <StatCard label="未开工" value={stats.notStarted} color="bg-slate-500" />
        <StatCard label="进行中" value={stats.inProgress} color="bg-mro-orange" />
        <StatCard label="已关闭" value={stats.closed} color="bg-mro-green" />
        <StatCard
          label="存在问题"
          value={stats.withIssues}
          color="bg-mro-red"
        />
        <StatCard
          label="需客户安全员"
          value={stats.needClient}
          color="bg-purple-500"
        />
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span>
            当日高风险作业列表
          </h2>
          <div className="text-sm text-slate-500">
            共 {filteredRisks.length} 条记录
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredRisks.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="text-5xl mb-3">📭</div>
                <p>当前筛选条件下暂无风险记录</p>
                <p className="text-sm mt-1">请调整筛选条件或前往"风险填报"新增记录</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">作业类型</th>
                  <th className="px-4 py-3 font-medium">风险等级</th>
                  <th className="px-4 py-3 font-medium">作业位置</th>
                  <th className="px-4 py-3 font-medium">飞机注册号</th>
                  <th className="px-4 py-3 font-medium">班组</th>
                  <th className="px-4 py-3 font-medium">合同</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">问题标识</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRisks.map((risk) => (
                  <tr
                    key={risk.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {WORK_TYPE_LABELS[risk.workType]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                          levelColors[risk.riskLevel]
                        }`}
                      >
                        {RISK_LEVEL_LABELS[risk.riskLevel]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {risk.location}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {risk.aircraftReg || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{risk.team}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {getContractCode(risk.contractId)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          risk.status === 'not_started'
                            ? 'bg-slate-100 text-slate-700'
                            : risk.status === 'in_progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {RISK_STATUS_LABELS[risk.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {risk.issues.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {risk.issues.map((issue) => (
                            <span
                              key={issue}
                              className="inline-block px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded"
                            >
                              ⚠️
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewRisk(risk.id)}
                        className="px-3 py-1 text-xs font-medium text-mro-blue hover:text-mro-blue-light hover:bg-blue-50 rounded transition-colors"
                      >
                        查看 / 编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const StatCard: React.FC<{
  label: string
  value: number
  color: string
}> = ({ label, value, color }) => (
  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white text-lg`}>
        {value}
      </div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  </div>
)

export default ProjectSelect
