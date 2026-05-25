import { useState, useEffect } from 'react'
import { logout, getCurrentUser } from './auth'
import { login as apiLogin } from './api'
import Dashboard from './pages/Dashboard'
import WorkOrders from './pages/WorkOrders'
import Equipment from './pages/Equipment'
import KanbanPage from './pages/Kanban'
import ForemanPage from './pages/ForemanPage'
import WorkerTasks from './pages/WorkerTasks'
import PDAWorker from './pages/PDAWorker'
import ProductChain from './pages/ProductChain'
import LoginPage from './pages/LoginPage'

const ADMIN_NAV = [
  { id: 'dashboard', label: '仪表盘', icon: '◈' },
  { id: 'kanban', label: '工序看板', icon: '▦' },
  { id: 'orders', label: '生产工单', icon: '⧉' },
  { id: 'equipment', label: '设备监控', icon: '⚙' },
  { id: 'prodchain', label: '产品链', icon: '🔗' },
]

const FOREMAN_NAV = [
  { id: 'foreman', label: '工单分配', icon: '⧉' },
  { id: 'dashboard', label: '工单总览', icon: '◈' },
  { id: 'kanban', label: '工序看板', icon: '▦' },
  { id: 'prodchain', label: '产品链', icon: '🔗' },
]

const WORKER_NAV = [
  { id: 'pda', label: '扫码报工', icon: '📱' },
  { id: 'tasks', label: '我的任务', icon: '◈' },
  { id: 'kanban', label: '工序看板', icon: '▦' },
  { id: 'prodchain', label: '产品链', icon: '🔗' },
]

function getStoredTheme() {
  if (typeof window === 'undefined') return 'dark'
  return localStorage.getItem('mes_theme') || 'dark'
}

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [apiErr, setApiErr] = useState(null)
  const [theme, setTheme] = useState(getStoredTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mes_theme', theme)
  }, [theme])

  useEffect(() => {
    const saved = getCurrentUser()
    if (saved) setUser(saved)
  }, [])

  async function tryApiLogin() {
    try { await apiLogin(); setApiErr(null) }
    catch { setApiErr('Steedos 未启动') }
  }

  useEffect(() => { if (user) tryApiLogin() }, [user])

  function handleLogin(u) {
    setUser(u)
    const nav = u.role === 'foreman' ? FOREMAN_NAV : u.role === 'worker' ? WORKER_NAV : ADMIN_NAV
    setPage(nav[0].id)
  }

  function handleLogout() { logout(); setUser(null) }

  if (!user) return <LoginPage onLogin={handleLogin} />

  const navItems = user.role === 'foreman' ? FOREMAN_NAV
    : user.role === 'worker' ? WORKER_NAV : ADMIN_NAV

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <aside className="w-60 shrink-0 glass border-r border-[var(--border)] flex flex-col">
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[#6366f1] flex items-center justify-center text-white font-bold text-sm">M</div>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>MES 系统</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>制造执行系统 v2.0</div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.name}</div>
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {user.role === 'admin' ? '系统管理员' : user.role === 'foreman' ? '工长' : '操作工'}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={'sidebar-link w-full ' + (page === item.id ? 'active' : '')}>
              <span className="w-6 text-center text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border)] space-y-3">
          {/* 主题切换 */}
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 text-xs w-full px-2 py-1.5 rounded-lg glass-hover"
            style={{ color: 'var(--text-secondary)' }}>
            <span>{theme === 'dark' ? '☀' : '🌙'}</span>
            {theme === 'dark' ? '白天模式' : '夜间模式'}
          </button>

          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="pulse-dot green" style={{ width: 6, height: 6 }} />
            {apiErr || 'Steedos 已连接'}
          </div>
          <button onClick={handleLogout}
            className="text-[10px] hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-muted)' }}>
            退出登录
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto grid-bg">
        {page === 'dashboard' && <Dashboard />}
        {page === 'orders' && <WorkOrders />}
        {page === 'equipment' && <Equipment />}
        {page === 'kanban' && <KanbanPage />}
        {page === 'foreman' && <ForemanPage />}
        {page === 'tasks' && <WorkerTasks />}
        {page === 'pda' && <PDAWorker />}
        {page === 'prodchain' && <ProductChain />}
      </main>
    </div>
  )
}
