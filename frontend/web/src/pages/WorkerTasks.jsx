import { useState, useEffect } from 'react'
import { fetchWorkOrders } from '../api'
import { getCurrentUser } from '../auth'

function parseDesc(desc, key) {
  if (!desc) return '-'
  const m = desc.match(new RegExp(key + ':[^|]*[^|]'))
  return m ? m[0].replace(key + ':', '').trim() : '-'
}

export default function WorkerTasks() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkOrders(200).then(o => {
      setOrders(o.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="h-full flex items-center justify-center"><div className="loading-ring w-10 h-10" /></div>

  const user = getCurrentUser()
  const assignments = JSON.parse(localStorage.getItem('mes_assignments') || '{}')
  const myTasks = orders.filter(o => assignments[o._id] === user?.id)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>我的任务</h1>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {user?.name} · {myTasks.length} 条任务
        </span>
      </div>

      {myTasks.length === 0 ? (
        <div className="card-border glass rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>暂无分配任务</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>请联系工长分配工作</div>
        </div>
      ) : (
        <div className="card-border glass rounded-xl overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>物料名称</th>
                <th>编号</th>
                <th>数量</th>
                <th>状态</th>
                <th>工序</th>
                <th>客户</th>
                <th>部门</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.map((o, i) => (
                <tr key={o._id || i}>
                  <td className="font-medium">{o.name || '-'}</td>
                  <td><span className="font-mono text-xs">{o.order_number || '-'}</span></td>
                  <td>{o.quantity || '-'}</td>
                  <td><span className="status-tag warning">{o.status || '-'}</span></td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{parseDesc(o.description, '工序')}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{parseDesc(o.description, '客户')}</td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{parseDesc(o.description, '部门')}</td>
                  <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{parseDesc(o.description, '备注')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
