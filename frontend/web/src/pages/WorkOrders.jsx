import { useState, useEffect } from 'react'
import { fetchWorkOrders } from '../api'

function statusTag(status) {
  if (!status) return <span className="status-tag info">未知</span>
  const s = String(status).toLowerCase()
  if (s.includes('进行') || s.includes('生产') || s === 'in_progress' || s === 'running') return <span className="status-tag active">{s === 'in_progress' ? '生产中' : status}</span>
  if (s.includes('完成') || s.includes('关闭') || s === 'completed' || s === 'done') return <span className="status-tag info">{s === 'completed' ? '已完成' : status}</span>
  if (s.includes('待') || s.includes('计划') || s.includes('下达') || s === 'pending') return <span className="status-tag warning">{s === 'pending' ? '待处理' : status}</span>
  return <span className="status-tag info">{status}</span>
}

// 从 description 字段中提取值
function parseDesc(desc, key) {
  if (!desc) return '-'
  const m = desc.match(new RegExp(key + ':[^|]*[^|]'))
  return m ? m[0].replace(key + ':', '').trim() : '-'
}

export default function WorkOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchWorkOrders(200).then(o => {
      setOrders(o.data || [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => {
    const st = String(o.status || '').toLowerCase()
    if (filter === 'closed') return st.includes('关闭') || st === 'completed' || st === 'done'
    if (filter === 'active') return st.includes('进行') || st.includes('生产') || st === 'in_progress'
    if (filter === 'pending') return st.includes('待') || st.includes('下达') || st === 'pending'
    return true
  })

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="loading-ring w-10 h-10" /></div>
  }

  const closed = orders.filter(o => String(o.status || '').includes('关闭') || String(o.status || '').includes('完成')).length
  const active = orders.filter(o => String(o.status || '').includes('进行') || String(o.status || '').includes('生产')).length
  const pending = orders.filter(o => String(o.status || '').includes('待') || String(o.status || '').includes('下达')).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">生产工单</h1>
        <span className="text-xs text-[var(--text-muted)]">共 {orders.length} 条记录</span>
      </div>

      {/* 统计条 */}
      <div className="flex gap-4">
        <div className="glass rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="status-tag warning">待处理</span>
          <span className="stat-value text-lg">{pending}</span>
        </div>
        <div className="glass rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="status-tag active">生产中</span>
          <span className="stat-value text-lg">{active}</span>
        </div>
        <div className="glass rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="status-tag info">已关闭</span>
          <span className="stat-value text-lg">{closed}</span>
        </div>
      </div>

      {/* 过滤栏 */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'pending', label: '待处理' },
          { key: 'active', label: '生产中' },
          { key: 'closed', label: '已关闭' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={'px-4 py-2 rounded-lg text-xs font-medium transition-all ' +
              (filter === f.key
                ? 'bg-[var(--accent)] text-white'
                : 'glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 工单列表 */}
      <div className="card-border glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>物料名称</th>
                <th>编号</th>
                <th>客户</th>
                <th>数量</th>
                <th>状态</th>
                <th>负责人</th>
                <th>部门</th>
                <th>交货日期</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center text-[var(--text-muted)] py-12">暂无工单</td></tr>
              )}
              {filtered.map((o, i) => (
                <tr key={o._id || i}>
                  <td className="font-medium">{o.name || '-'}</td>
                  <td><span className="font-mono text-xs">{o.order_number || '-'}</span></td>
                  <td className="text-xs text-[var(--text-secondary)]">{parseDesc(o.description, '客户')}</td>
                  <td>{o.quantity != null ? o.quantity : '-'}</td>
                  <td>{statusTag(o.status)}</td>
                  <td className="text-xs">{parseDesc(o.description, '负责人')}</td>
                  <td className="text-xs text-[var(--text-secondary)]">{parseDesc(o.description, '部门')}</td>
                  <td className="text-xs text-[var(--text-secondary)]">
                    {o.planned_end_date ? new Date(o.planned_end_date).toLocaleDateString('zh-CN') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
