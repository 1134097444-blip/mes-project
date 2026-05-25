import { useState, useEffect } from 'react'
import { fetchEquipment, fetchEquipmentFaults } from '../api'

function statusTag(status) {
  if (!status) return <span className="status-tag info">未知</span>
  const s = String(status).toLowerCase()
  if (s.includes('运行') || s.includes('正常') || s === 'running') return <span className="status-tag active">{status === 'running' ? '运行中' : status}</span>
  if (s.includes('待机') || s.includes('空闲') || s === 'idle') return <span className="status-tag warning">{status === 'idle' ? '待机' : status}</span>
  if (s.includes('故障') || s.includes('维修') || s.includes('停机') || s.includes('maintenance')) return <span className="status-tag error">{status === 'maintenance' ? '维保中' : status}</span>
  return <span className="status-tag info">{status}</span>
}

function EquipmentCard({ eq }) {
  const statusColor = String(eq.status || '').includes('运行')
    ? 'green'
    : String(eq.status || '').includes('故障') ? 'red' : 'orange'

  return (
    <div className="card-border glass rounded-xl p-5 relative group glass-hover">
      <div className="scan-line" style={{ animationDelay: Math.random() * 3 + 's' }} />
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={'pulse-dot ' + statusColor} />
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{eq.name || '-'}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono">{eq.equipment_code || '-'}</div>
          </div>
        </div>
        <div className="text-2xl">⚙</div>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">状态</span>
          <span>{statusTag(eq.status)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">类型</span>
          <span className="text-[var(--text-secondary)]">{eq.equipment_type || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">位置</span>
          <span className="text-[var(--text-secondary)]">{eq.location || '-'}</span>
        </div>
      </div>
    </div>
  )
}

export default function Equipment() {
  const [equip, setEquip] = useState([])
  const [faults, setFaults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchEquipment(), fetchEquipmentFaults(100)]).then(([e, f]) => {
      setEquip(e.data || [])
      setFaults(f.data || [])
      setLoading(false)
    })
  }, [])

  const running = equip.filter(e => String(e.status || '').includes('运行')).length
  const faulted = equip.filter(e => String(e.status || '').includes('故障')).length
  const idle = equip.filter(e => !String(e.status || '').includes('运行') && !String(e.status || '').includes('故障')).length

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="loading-ring w-10 h-10" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">设备监控</h1>
        <span className="text-xs text-[var(--text-muted)]">共 {equip.length} 台设备</span>
      </div>

      {/* 状态概览 */}
      <div className="flex gap-4">
        <div className="glass rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="pulse-dot green" />
          <span className="text-xs text-[var(--text-muted)]">运行中</span>
          <span className="stat-value text-lg">{running}</span>
        </div>
        <div className="glass rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="pulse-dot" style={{ background: 'var(--accent-orange)' }} />
          <span className="text-xs text-[var(--text-muted)]">待机/空闲</span>
          <span className="stat-value text-lg">{idle}</span>
        </div>
        <div className="glass rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="pulse-dot red" />
          <span className="text-xs text-[var(--text-muted)]">故障</span>
          <span className="stat-value text-lg" style={{ WebkitTextFillColor: faulted > 0 ? '#ff1744' : '#00e676' }}>{faulted}</span>
        </div>
      </div>

      {/* 设备网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {equip.map((e, i) => <EquipmentCard key={e._id || i} eq={e} />)}
        {equip.length === 0 && (
          <div className="col-span-full text-center py-16 text-[var(--text-muted)] text-sm">暂无设备数据</div>
        )}
      </div>

      {/* 故障记录 */}
      {faults.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">故障报修记录</h2>
          <div className="card-border glass rounded-xl overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>设备</th>
                  <th>故障描述</th>
                  <th>严重程度</th>
                  <th>状态</th>
                  <th>报告时间</th>
                </tr>
              </thead>
              <tbody>
                {faults.slice(0, 8).map((f, i) => (
                  <tr key={f._id || i}>
                    <td className="font-medium">{f.equipment_name || f.equipment || '-'}</td>
                    <td className="text-xs text-[var(--text-secondary)]">{f.description || f.name || '-'}</td>
                    <td>
                      {String(f.severity || '').includes('高') || String(f.severity || '').includes('严重')
                        ? <span className="status-tag error">严重</span>
                        : String(f.severity || '').includes('中')
                          ? <span className="status-tag warning">中</span>
                          : <span className="status-tag info">低</span>
                      }
                    </td>
                    <td>{statusTag(f.status)}</td>
                    <td className="text-xs text-[var(--text-secondary)]">
                      {f.created ? new Date(f.created).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
