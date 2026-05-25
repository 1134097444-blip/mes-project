import { useState, useEffect } from 'react'
import { fetchAllDashboard } from '../api'

function StatCard({ label, value, unit, icon, color }) {
  return (
    <div className="card-border glass rounded-xl p-5 relative overflow-hidden group glass-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">
            {label}
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="stat-value text-3xl">{value}</span>
            {unit && <span className="text-xs text-[var(--text-secondary)]">{unit}</span>}
          </div>
        </div>
        <div className="text-2xl" style={{ color }}>{icon}</div>
      </div>
      <div className="scan-line" style={{ animationDelay: Math.random() * 3 + 's' }} />
    </div>
  )
}

function MiniTable({ title, data, fields, empty }) {
  if (!data || data.length === 0) {
    return (
      <div className="card-border glass rounded-xl p-5">
        <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">{title}</div>
        <div className="text-xs text-[var(--text-muted)] text-center py-8">{empty || '暂无数据'}</div>
      </div>
    )
  }
  return (
    <div className="card-border glass rounded-xl p-5">
      <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">{title}</div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {fields.map(f => <th key={f.key}>{f.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 6).map((row, i) => (
              <tr key={i}>
                {fields.map(f => (
                  <td key={f.key}>
                    {f.render ? f.render(row[f.key], row) : row[f.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function statusTag(status) {
  if (!status) return <span className="status-tag info">未知</span>
  const s = String(status).toLowerCase()
  if (s.includes('进行') || s.includes('生产') || s.includes('运行') || s === 'in_progress' || s === 'running') return <span className="status-tag active">{status === 'in_progress' ? '生产中' : status}</span>
  if (s.includes('完成') || s.includes('已完') || s === 'completed' || s === 'done') return <span className="status-tag info">{status === 'completed' ? '已完成' : status}</span>
  if (s.includes('待') || s.includes('计划') || s.includes('排队') || s === 'pending' || s === 'planned') return <span className="status-tag warning">{status === 'pending' ? '待处理' : status}</span>
  if (s.includes('故障') || s.includes('异常') || s.includes('不合格') || s.includes('error') || s === 'failed') return <span className="status-tag error">{status}</span>
  return <span className="status-tag info">{status}</span>
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllDashboard().then(d => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="loading-ring w-10 h-10" />
      </div>
    )
  }

  const orders = data.orders?.data || []
  const equip = data.equip?.data || []
  const reports = data.reports?.data || []
  const tasks = data.tasks?.data || []
  const faults = data.faults?.data || []
  const nonconf = data.nonconf?.data || []

  const plannedOrders = orders.filter(o => String(o.status || '').includes('待') || String(o.status || '').includes('计划')).length
  const runningOrders = orders.filter(o => String(o.status || '').includes('进行') || String(o.status || '').includes('生产')).length
  const completedOrders = orders.filter(o => String(o.status || '').includes('完成')).length
  const faultCount = faults.length
  const equipRunning = equip.filter(e => String(e.status || '').includes('运行')).length
  const equipIdle = equip.filter(e => String(e.status || '').includes('待机') || String(e.status || '').includes('空闲')).length

  return (
    <div className="p-6 space-y-6">
      {/* 顶部标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">生产仪表盘</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {new Date().toLocaleString('zh-CN')} · 实时数据
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="pulse-dot green" style={{ width: 6, height: 6 }} />
          数据正常
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="生产工单" value={orders.length} icon="📋" color="#3898ec" />
        <StatCard label="设备总数" value={equip.length} icon="⚙" color="#6c63ff" />
        <StatCard label="今日报工" value={reports.length} icon="📊" color="#00e676" />
        <StatCard label="进行中任务" value={tasks.length} icon="🔄" color="#ff9100" />
      </div>

      {/* 第二行状态卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-border glass rounded-xl p-5">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">待计划工单</div>
          <div className="stat-value text-2xl">{plannedOrders}</div>
        </div>
        <div className="card-border glass rounded-xl p-5">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">生产中工单</div>
          <div className="stat-value text-2xl">{runningOrders}</div>
        </div>
        <div className="card-border glass rounded-xl p-5">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">已完成工单</div>
          <div className="stat-value text-2xl">{completedOrders}</div>
        </div>
        <div className="card-border glass rounded-xl p-5">
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">设备故障</div>
          <div className="stat-value text-2xl" style={{ WebkitTextFillColor: faultCount > 0 ? '#ff1744' : '#00e676' }}>{faultCount}</div>
        </div>
      </div>

      {/* 实时列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MiniTable
          title="最近工单"
          data={orders}
          fields={[
            { key: 'name', label: '名称' },
            { key: 'order_number', label: '编号' },
            { key: 'status', label: '状态', render: v => statusTag(v) },
          ]}
          empty="暂无工单数据"
        />
        <MiniTable
          title="设备状态"
          data={equip}
          fields={[
            { key: 'name', label: '设备名称' },
            { key: 'equipment_code', label: '编号' },
            { key: 'status', label: '状态', render: v => statusTag(v) },
          ]}
          empty="暂无设备数据"
        />
        <MiniTable
          title="报工记录"
          data={reports}
          fields={[
            { key: 'name', label: '名称' },
            { key: 'status', label: '状态', render: v => statusTag(v) },
          ]}
          empty="暂无报工记录"
        />
        <MiniTable
          title="未处理异常"
          data={nonconf}
          fields={[
            { key: 'name', label: '名称' },
            { key: 'status', label: '状态', render: v => statusTag(v) },
          ]}
          empty="暂无异常记录"
        />
      </div>
    </div>
  )
}
