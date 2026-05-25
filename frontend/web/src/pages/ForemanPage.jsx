import { useState, useEffect } from 'react'
import { fetchWorkOrders } from '../api'

function parseDesc(desc, key) {
  if (!desc) return '-'
  const m = desc.match(new RegExp(key + ':[^|]*[^|]'))
  return m ? m[0].replace(key + ':', '').trim() : '-'
}

const WORKERS = [
  { id: 'wangshi', name: '王师傅' },
  { id: 'worker2', name: '刘工' },
  { id: 'worker3', name: '陈师' },
]

export default function ForemanPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState({}) // { orderMongoId: workerId }

  useEffect(() => {
    fetchWorkOrders(200).then(o => {
      setOrders(o.data || [])
      setLoading(false)
    })
    // 从 localStorage 恢复分配记录
    const saved = localStorage.getItem('mes_assignments')
    if (saved) setAssignments(JSON.parse(saved))
  }, [])

  function assign(oid, wid) {
    const next = { ...assignments, [oid]: wid }
    setAssignments(next)
    localStorage.setItem('mes_assignments', JSON.stringify(next))
  }

  if (loading) return <div className="h-full flex items-center justify-center"><div className="loading-ring w-10 h-10" /></div>

  const unassigned = orders.filter(o => !assignments[o._id])
  const assigned = orders.filter(o => assignments[o._id])

  // 按工人分组
  const byWorker = {}
  for (const oid in assignments) {
    const wid = assignments[oid]
    if (!byWorker[wid]) byWorker[wid] = []
    const order = orders.find(o => o._id === oid)
    if (order) byWorker[wid].push(order)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>工单分配</h1>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          已分配 {assigned.length} / {orders.length}
        </span>
      </div>

      {/* 工人工作量卡片 */}
      <div className="grid grid-cols-3 gap-4">
        {WORKERS.map(w => {
          const items = byWorker[w.id] || []
          return (
            <div key={w.id} className="card-border glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3898ec] to-[#6c63ff] flex items-center justify-center text-white text-xs font-bold">
                  {w.name.slice(0, 1)}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{w.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {items.length} 条任务
                  </div>
                </div>
              </div>
              <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                {items.slice(0, 3).map((o, i) => (
                  <div key={i} className="truncate">{o.name}</div>
                ))}
                {items.length > 3 && <div style={{ color: 'var(--text-muted)' }}>...还有 {items.length - 3} 条</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* 未分配工单列表 */}
      <div className="card-border glass rounded-xl overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>未分配工单</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>物料名称</th>
                <th>编号</th>
                <th>数量</th>
                <th>工序</th>
                <th>客户</th>
                <th>分配</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>全部已分配 ✅</td></tr>
              )}
              {unassigned.slice(0, 20).map((o, i) => (
                <tr key={o._id || i}>
                  <td className="font-medium">{o.name || '-'}</td>
                  <td><span className="font-mono text-xs">{o.order_number || '-'}</span></td>
                  <td>{o.quantity || '-'}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{parseDesc(o.description, '工序')}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{parseDesc(o.description, '客户')}</td>
                  <td>
                    <select
                      value={assignments[o._id] || ''}
                      onChange={e => assign(o._id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border outline-none"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      <option value="">选择工人</option>
                      {WORKERS.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 已分配工单（按工人分组） */}
      {WORKERS.map(w => {
        const items = byWorker[w.id] || []
        if (items.length === 0) return null
        return (
          <div key={'d' + w.id} className="card-border glass rounded-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{w.name} 的任务 ({items.length})</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>物料名称</th>
                  <th>编号</th>
                  <th>数量</th>
                  <th>状态</th>
                  <th>工序</th>
                  <th>部门</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o, i) => (
                  <tr key={o._id || i}>
                    <td className="font-medium">{o.name || '-'}</td>
                    <td><span className="font-mono text-xs">{o.order_number || '-'}</span></td>
                    <td>{o.quantity || '-'}</td>
                    <td><span className="status-tag info">{o.status || '-'}</span></td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{parseDesc(o.description, '工序')}</td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{parseDesc(o.description, '部门')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
