import React from 'react'
import { useStore } from '@/store'
import ProjectSelect from '@/views/ProjectSelect'
import RiskFill from '@/views/RiskFill'
import DailyReport from '@/views/DailyReport'
import DailyReportPrint from '@/views/DailyReportPrint'

const App: React.FC = () => {
  const { currentView, setCurrentView } = useStore()

  const navItems = [
    { key: 'project', label: '项目选择', icon: '📋' },
    { key: 'fill', label: '风险填报', icon: '✏️' },
    { key: 'report', label: '日报输出', icon: '📊' },
  ] as const

  const inPrint = currentView === 'report-print'

  return (
    <div className={`${inPrint ? 'min-h-screen' : 'flex flex-col h-screen'}`}>
      <header
        className={`bg-mro-blue text-white px-6 py-3 flex items-center justify-between shadow-md ${
          inPrint ? 'print:hidden' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">✈️</div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">
              民航维修现场风险日报系统
            </h1>
            <p className="text-xs text-blue-200">
              MRO Site Risk Daily Report Tool
            </p>
          </div>
        </div>
        <nav className="flex gap-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentView(item.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                currentView === item.key ||
                (item.key === 'report' && inPrint)
                  ? 'bg-white text-mro-blue shadow'
                  : 'hover:bg-mro-blue-light text-white'
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className={`${inPrint ? '' : 'flex-1 overflow-hidden bg-slate-50'}`}>
        {currentView === 'project' && <ProjectSelect />}
        {currentView === 'fill' && <RiskFill />}
        {currentView === 'report' && <DailyReport />}
        {currentView === 'report-print' && <DailyReportPrint />}
      </main>
    </div>
  )
}

export default App
