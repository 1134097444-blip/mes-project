import { useState, useEffect } from 'react'
import { fetchWorkOrders } from '../api'

function parseDesc(desc, key) {
  if (!desc) return '-'
  const m = desc.match(new RegExp(key + ':[^|]*[^|]'))
  return m ? m[0].replace(key + ':', '').trim() : '-'
}

function statusTag(status) {
  if (!status) return <span className="status-tag info">未知</span>
  const s = String(status).toLowerCase()
  if (s.includes('进行') || s.includes('生产') || s.includes('运行') || s === 'in_progress' || s === 'running') return <span className="status-tag active">{s === 'in_progress' ? '生产中' : status}</span>
  if (s.includes('完成') || s.includes('关闭') || s === 'completed' || s === 'done') return <span className="status-tag info">{s === 'completed' ? '已完成' : status}</span>
  if (s.includes('待') || s.includes('计划') || s.includes('下达') || s === 'pending') return <span className="status-tag warning">{s === 'pending' ? '待处理' : status}</span>
  return <span className="status-tag info">{status}</span>
}

function wfTag(wf) {
  const map = {
    '待处理': <span className="status-tag info" style={{opacity:0.6}}>⊘ 待处理</span>,
    '派工': <span className="status-tag warning">📋 派工</span>,
    '送工': <span className="status-tag" style={{background:'var(--accent-glow)',color:'var(--accent)'}}>🚚 送工</span>,
    '开工': <span className="status-tag active">🔨 开工</span>,
    '完工': <span className="status-tag info">✅ 完工</span>,
  }
  return map[wf] || <span className="status-tag info">{wf || '待处理'}</span>
}

const CHAIN_COLORS = ['#3898ec', '#6c63ff', '#00e676', '#ff9100', '#6366f1', '#e040fb', '#00bcd4', '#ff1744']

function ChainCard({ orders, customerName, groupIndex }) {
  const [collapsed, setCollapsed] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const color = CHAIN_COLORS[groupIndex % CHAIN_COLORS.length]

  if (orders.length === 0) return null

  const doneCount = orders.filter(o => (o.wf_status || '待处理') === '完工').length
  const activeCount = orders.filter(o => o.wf_status && o.wf_status !== '待处理' && o.wf_status !== '完工').length
  const pendingCount = orders.length - doneCount - activeCount

  return (
    <div className="card-border glass rounded-xl overflow-hidden">
      {/* 头部 — 点击折叠 */}
      <div className="p-4 flex items-center justify-between cursor-pointer glass-hover"
        onClick={() => setCollapsed(v => !v)}
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-base font-bold"
            style={{ background: `linear-gradient(135deg, ${color}, ${CHAIN_COLORS[(groupIndex+1)%CHAIN_COLORS.length]})` }}>
            {customerName.slice(0, 1)}
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{customerName}</div>
            <div className="text-[10px] flex gap-2" style={{ color: 'var(--text-muted)' }}>
              <span>{orders.length} 条工单</span>
              {doneCount > 0 && <span style={{color:'var(--accent-green)'}}>{doneCount} 完工</span>}
              {activeCount > 0 && <span style={{color:'var(--accent-orange)'}}>{activeCount} 进行中</span>}
              {pendingCount > 0 && <span>{pendingCount} 待处理</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[{label:'✅',v:doneCount},{label:'🔄',v:activeCount},{label:'⏳',v:pendingCount}].map((s,i)=>(
              <div key={i} className="text-xs px-2 py-1 rounded-lg text-center" style={{
                background: s.v>0 ? color+'20' : 'transparent',
                color: s.v>0 ? 'var(--text-secondary)' : 'var(--text-muted)'
              }}>{s.label}{s.v}</div>
            ))}
          </div>
          <span className="text-sm" style={{color:'var(--text-muted)'}}>{collapsed ? '▶' : '▼'}</span>
        </div>
      </div>

      {/* 折叠的简洁摘要 */}
      {collapsed && (
        <div className="px-4 pb-3 flex items-center gap-4 text-xs" style={{color:'var(--text-muted)'}}>
          <span>{doneCount}/{orders.length} 已完工</span>
          <span>·</span>
          <span>共 {orders.map(o => o.quantity||0).reduce((a,b)=>a+b,0)} 件产品</span>
          {orders.length > 0 && orders[0].planned_end_date && (
            <>
              <span>·</span>
              <span>最近交付: {new Date(Math.max(...orders.filter(o=>o.planned_end_date).map(o=>+new Date(o.planned_end_date)))).toLocaleDateString('zh-CN')}</span>
            </>
          )}
        </div>
      )}

      {/* 展开的工单链 */}
      {!collapsed && (
        <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {orders.slice(0, 50).map((o, i) => {
            const isExpanded = expanded === o._id
            const wf = o.wf_status || '待处理'
            const opRaw = parseDesc(o.description, '工序')
            const ops = opRaw !== '-' ? opRaw.split(/[,，、\s]+/).filter(Boolean) : []
            const person = parseDesc(o.description, '负责人')
            const dept = parseDesc(o.description, '部门')
            const wh = parseDesc(o.description, '仓库')

            // 动态节点链：客户 → 工单 → 工序1 → 工序2 → ... → 工作流 → 交付
            const nodes = []
            nodes.push({ id:'customer', label:'客户', icon:'👤', val: customerName.slice(0,8) })
            nodes.push({ id:'order', label:'工单', icon:'📋', val: `${(o.name||'').slice(0,6)}×${o.quantity||'-'}` })
            for (const op of ops) {
              nodes.push({ id:'op', label:'工序', icon:'🔧', val: op.slice(0,5) })
            }
            if (ops.length === 0) nodes.push({ id:'op', label:'工序', icon:'🔧', val:'待定' })
            nodes.push({ id:'flow', label:'状态', icon:'⚙', val: wf.slice(0,3) })
            nodes.push({ id:'delivery', label:'交付', icon:'📦', val: o.planned_end_date ? new Date(o.planned_end_date).toLocaleDateString('zh-CN',{month:'short',day:'numeric'}) : '待定' })

            return (
              <div key={o._id || i}>
                <div className="flex items-start gap-3 cursor-pointer glass-hover rounded-lg p-3 transition-all"
                  onClick={() => setExpanded(isExpanded ? null : o._id)}
                  style={{ borderLeft: isExpanded ? `3px solid ${color}` : '3px solid transparent' }}>
                  <div className="shrink-0 relative mt-1">
                    <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                      style={{ borderColor: color, color, background: isExpanded ? color+'15' : 'transparent' }}>
                      {i + 1}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{o.name || '-'}</span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{o.order_number || '-'}</span>
                    </div>

                    {/* 动态节点链（横向时间线）*/}
                    <div className="flex items-center gap-0 mt-2 overflow-x-auto pb-1 scrollbar-thin">
                      {nodes.map((n, ni) => (
                        <div key={ni} className="flex items-center gap-0 shrink-0">
                          {ni > 0 && (
                            <div className="w-3 relative">
                              <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: ni <= nodes.length-2 ? color+'60' : 'var(--border)' }} />
                            </div>
                          )}
                          <div className="text-center rounded-lg px-1.5 py-1 text-[9px] leading-tight"
                            style={{
                              background: 'var(--bg-secondary)',
                              border: `1px solid ${color}40`,
                              minWidth: '36px'
                            }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '8px' }}>{n.icon}</div>
                            <div className="font-semibold truncate" style={{ color, maxWidth: '48px' }}>{n.val}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '7px' }}>{n.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 进度条 */}
                    <div className="mt-2 flex items-center gap-1">
                      <div className="flex-1 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: wf==='完工'?'100%':wf==='开工'?'80%':wf==='送工'?'60%':wf==='派工'?'40%':'5%',
                          background: `linear-gradient(90deg, ${color}, ${CHAIN_COLORS[(groupIndex+1)%CHAIN_COLORS.length]})`
                        }} />
                      </div>
                      <span className="text-[10px] shrink-0">{wfTag(wf)}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs self-center" style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>

                {/* 展开详情 */}
                {isExpanded && (
                  <div className="mt-2 ml-11 p-4 rounded-xl space-y-3"
                    style={{ background: 'var(--bg-secondary)', border: `1px solid var(--border)` }}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <Detail label="客户" val={customerName} />
                      <Detail label="部门" val={dept} />
                      <Detail label="物料" val={o.name || '-'} />
                      <Detail label="数量" val={`${o.quantity||'-'} 件`} />
                      <Detail label="负责人" val={person} />
                      <Detail label="仓库" val={wh} />
                      <Detail label="状态" val={statusTag(o.status)} node />
                      <Detail label="开始" val={o.planned_start_date ? new Date(o.planned_start_date).toLocaleDateString('zh-CN') : '-'} />
                      <Detail label="交付" val={o.planned_end_date ? new Date(o.planned_end_date).toLocaleDateString('zh-CN') : '-'} />
                      <Detail label="工单号" val={o.order_number || '-'} />
                      {ops.length > 0 && (
                        <Detail label="全部工序" val={ops.join(' → ')} />
                      )}
                    </div>
                    {o.description && (
                      <div className="text-[10px] italic p-2 rounded-lg" style={{color:'var(--text-muted)', background:'var(--bg-primary)'}}>
                        {parseDesc(o.description, '备注') !== '-' ? `📝 ${parseDesc(o.description, '备注')}` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {orders.length > 50 && (
            <div className="text-center text-xs py-2" style={{ color: 'var(--text-muted)' }}>
              ... 还有 {orders.length - 50} 条工单（请使用搜索筛选）
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ label, val, node }) {
  return (
    <div className="flex items-start gap-2">
      <div>
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
          {node ? val : (val || '-')}
        </div>
      </div>
    </div>
  )
}

export default function ProductChain() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandAll, setExpandAllState] = useState(false)

  useEffect(() => {
    fetchWorkOrders(300).then(o => {
      setOrders(o.data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="loading-ring w-10 h-10" />
    </div>
  )

  // 按客户分组
  const groups = {}
  for (const o of orders) {
    const customer = parseDesc(o.description, '客户')
    if (!groups[customer]) groups[customer] = []
    groups[customer].push(o)
  }

  let groupList = Object.entries(groups)
  if (search.trim()) {
    const q = search.toLowerCase()
    groupList = groupList.filter(([customer, ords]) => {
      if (customer.toLowerCase().includes(q)) return true
      return ords.some(o =>
        (o.name||'').toLowerCase().includes(q) ||
        (o.order_number||'').toLowerCase().includes(q) ||
        parseDesc(o.description, '工序').toLowerCase().includes(q) ||
        parseDesc(o.description, '负责人').toLowerCase().includes(q)
      )
    })
  }

  if (filterStatus !== 'all') {
    groupList = groupList.filter(([, ords]) => {
      if (filterStatus === 'done') return ords.some(o => (o.wf_status||'待处理')==='完工')
      if (filterStatus === 'active') return ords.some(o => o.wf_status && o.wf_status!=='待处理' && o.wf_status!=='完工')
      if (filterStatus === 'pending') return ords.some(o => !o.wf_status || o.wf_status==='待处理')
      return true
    })
  }

  const totalCustomers = groupList.length
  const totalOrders = orders.length
  const doneOrders = orders.filter(o => (o.wf_status||'待处理')==='完工').length
  const activeOrders = orders.filter(o => o.wf_status && o.wf_status!=='待处理' && o.wf_status!=='完工').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>产品链</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            客户 → 工单 → 工序 → 状态 → 交付 · 全链路追踪
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{totalCustomers} 个客户</span>
          <span>·</span>
          <span>{totalOrders} 条工单</span>
        </div>
      </div>

      {/* 统计 + 全局折叠 */}
      <div className="flex items-center gap-3">
        <div className="grid grid-cols-4 gap-3 flex-1">
          {[
            { label:'全部工单', v:totalOrders, color:'#3898ec' },
            { label:'已完工', v:doneOrders, color:'#00e676' },
            { label:'进行中', v:activeOrders, color:'#ff9100' },
            { label:'客户数', v:totalCustomers, color:'#6c63ff' },
          ].map((s,i)=>(
            <div key={i} className="glass rounded-xl p-3 card-border text-center">
              <div className="stat-value text-2xl">{s.v}</div>
              <div className="text-[10px] mt-0.5" style={{color:s.color}}>{s.label}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setExpandAllState(v=>!v)}
          className="text-xs px-3 py-1.5 rounded-lg border shrink-0"
          style={{borderColor:'var(--border)',color:'var(--text-secondary)'}}>
          {expandAll ? '全部折叠' : '全部展开'}
        </button>
      </div>

      {/* 搜索 */}
      <div className="glass rounded-xl p-3 card-border flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{color:'var(--text-muted)'}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="搜索客户、物料、编号、工序..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs outline-none"
            style={{background:'var(--bg-secondary)',color:'var(--text-primary)',borderColor:'var(--border)'}} />
        </div>
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {['all','active','done','pending'].map(f=>(
            <button key={f} onClick={()=>setFilterStatus(f)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: filterStatus===f ? 'var(--accent-glow)' : 'transparent',
                color: filterStatus===f ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              {{all:'全部',active:'进行中',done:'已完工',pending:'待处理'}[f]}
            </button>
          ))}
        </div>
        {search && (
          <button onClick={()=>setSearch('')} className="text-xs px-3 py-2 rounded-lg glass" style={{color:'var(--text-secondary)'}}>清除</button>
        )}
      </div>

      {/* 产品链卡片（默认折叠） */}
      <div className="space-y-3">
        {groupList.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{color:'var(--text-muted)'}}>没有匹配的数据</div>
        ) : (
          groupList.map(([customer,ords],i) => (
            <ChainCard key={customer} customerName={customer} orders={ords} groupIndex={i} />
          ))
        )}
      </div>
    </div>
  )
}
