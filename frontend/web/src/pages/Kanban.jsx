import { useState, useEffect, useRef } from 'react'
import { fetchWorkOrders, fetchOperations } from '../api'

function parseDesc(desc, key) {
  if (!desc) return '-'
  const m = desc.match(new RegExp(key + ':[^|]*[^|]'))
  return m ? m[0].replace(key + ':', '').trim() : '-'
}

function wfTag(wf) {
  const map = {
    '派工': <span className="status-tag warning">📋 派工</span>,
    '送工': <span className="status-tag" style={{background:'var(--accent-glow)',color:'var(--accent)'}}>🚚 送工</span>,
    '开工': <span className="status-tag active">🔨 开工</span>,
    '完工': <span className="status-tag info">✅ 完工</span>,
  }
  return map[wf] || <span className="status-tag info">{wf}</span>
}

const WF_STEPS = ['待处理', '派工', '送工', '开工', '完工']
const WF_COLORS = ['#94a3b8', '#ff9100', '#3898ec', '#00e676', '#6366f1']
const WI_STEPS = ['派工', '送工', '开工', '完工']

async function advanceWf(order, setOrders) {
  const current = order.wf_status || '待处理'
  const idx = WF_STEPS.indexOf(current)
  const next = WF_STEPS[idx + 1]
  if (!next) return
  const token = sessionStorage.getItem('mes_api_token')
  if (!token) return
  try {
    const res = await fetch('/api/v6/data/mes_work_orders/' + order._id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ wf_status: next }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o =>
        o._id === order._id ? { ...o, wf_status: next } : o
      ))
    }
  } catch {}
}

async function batchAdvance(ordersInOp, currentWf, setOrders) {
  const nextWf = WF_STEPS[WF_STEPS.indexOf(currentWf) + 1]
  if (!nextWf) return
  const token = sessionStorage.getItem('mes_api_token')
  if (!token) return
  let ok = 0
  for (const o of ordersInOp) {
    try {
      await fetch('/api/v6/data/mes_work_orders/' + o._id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ wf_status: nextWf }),
      })
      ok++
    } catch {}
  }
  if (ok > 0) {
    setOrders(prev => prev.map(o =>
      ordersInOp.some(x => x._id === o._id) ? { ...o, wf_status: nextWf } : o
    ))
    return '✅ 批量推进 ' + ok + ' 条工单到「' + nextWf + '」'
  }
  return null
}

const CHART_COLORS = [
  '#3898ec','#6c63ff','#00e676','#ff9100','#e040fb',
  '#00bcd4','#ff1744','#ffc107','#00c853','#448aff',
  '#ff6d00','#aa00ff','#009688','#cddc39','#ff4081',
]

function getColor(idx) { return CHART_COLORS[idx % CHART_COLORS.length] }

// ================ 视图组件 ================

function DonutView({ groupList, totalOrders, onSelect }) {
  // groupList: [[key, {name, count}], ...]
  const active = groupList.filter(([,g]) => g.count > 0).sort((a,b) => b[1].count - a[1].count)
  if (active.length === 0) return <div className="text-center py-16 text-sm text-[var(--text-muted)]">暂无数据</div>

  const R = 80; const cx = 90; const cy = 90
  const circumference = 2 * Math.PI * R
  let offset = 0

  return (
    <div className="card-border glass rounded-xl p-5">
      <div className="flex flex-col md:flex-row items-center gap-5">
        {/* Ring chart */}
        <svg viewBox="0 0 180 180" className="w-[180px] h-[180px] shrink-0">
          {active.map(([key, g], i) => {
            const pct = g.count / totalOrders
            const dashLen = pct * circumference
            const ring = (
              <circle key={key} cx={cx} cy={cy} r={R}
                fill="none" stroke={getColor(i)} strokeWidth="14"
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={-offset}
                style={{ transition: 'stroke-dasharray 0.5s' }}
              />
            )
            offset += dashLen
            return ring
          })}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700">{totalOrders}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="10">工单总数</text>
        </svg>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 w-full">
          {active.slice(0, 12).map(([key, g], i) => (
            <div key={key}
              onClick={() => onSelect(key)}
              className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer glass-hover transition-all"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getColor(i) }} />
              <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{g.name || g.op?.name}</span>
              <span className="text-xs font-semibold stat-value">{g.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BarView({ groupList, maxCount, onSelect }) {
  const active = groupList.filter(([,g]) => g.count > 0)
  if (active.length === 0) return <div className="text-center py-16 text-sm text-[var(--text-muted)]">暂无数据</div>

  return (
    <div className="card-border glass rounded-xl p-5">
      <div className="space-y-2">
        {active.slice(0, 20).map(([key, g], i) => {
          const w = maxCount > 0 ? (g.count / maxCount) * 100 : 0
          return (
            <div key={key}
              onClick={() => onSelect(key)}
              className="group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="truncate mr-2" style={{ color: 'var(--text-primary)' }}>{g.name || g.op?.name}</span>
                <span className="font-semibold stat-value">{g.count}</span>
              </div>
              <div className="h-5 rounded-md bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500 flex items-center"
                  style={{ width: Math.max(w, 1) + '%', background: `linear-gradient(90deg, ${getColor(i)}, ${getColor(i+1)})` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ================ 主组件 ================

export default function KanbanPage() {
  const [orders, setOrders] = useState([])
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOp, setSelectedOp] = useState(null)
  const [wfFilter, setWfFilter] = useState('all')
  const [msg, setMsg] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [showEmpty, setShowEmpty] = useState(true)
  const [viewMode, setViewMode] = useState('grid')   // grid | donut | bar
  const [sortMode, setSortMode] = useState('name')   // name | count | date
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionIdx, setSuggestionIdx] = useState(-1)
  const searchRef = useRef(null)
  const suggestRef = useRef(null)

  // 加载数据
  useEffect(() => {
    Promise.all([
      fetchWorkOrders(200),
      fetchOperations(200).catch(() => null),
    ]).then(([oData, opData]) => {
      setOrders(oData.data || [])
      if (opData && Array.isArray(opData.data)) {
        setOperations(opData.data)
      } else if (opData && Array.isArray(opData)) {
        setOperations(opData)
      }
      setLoading(false)
    })
  }, [])

  // 点击外部关闭建议
  useEffect(() => {
    function handler(e) {
      if (suggestRef.current && !suggestRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading) return <div className="h-full flex items-center justify-center"><div className="loading-ring w-10 h-10" /></div>

  // 过滤工单
  const filteredOrders = orders.filter(o => {
    if (wfFilter !== 'all' && (o.wf_status || '待处理') !== wfFilter) return false
    if (filterDept !== 'all' && parseDesc(o.description, '部门') !== filterDept) return false
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      const name = (o.name || '').toLowerCase()
      const code = (o.order_number || '').toLowerCase()
      const customer = parseDesc(o.description, '客户').toLowerCase()
      const person = parseDesc(o.description, '负责人').toLowerCase()
      const opName = parseDesc(o.description, '工序').toLowerCase()
      if (!name.includes(q) && !code.includes(q) && !customer.includes(q) && !person.includes(q) && !opName.includes(q)) return false
    }
    return true
  })

  // 构建分组
  const hasOps = operations.length > 0
  const groups = {}
  let unmatchedOrders = []

  if (hasOps) {
    for (const op of operations) {
      groups[op._id] = { op, orders: [], count: 0 }
    }
    const opByName = {}
    for (const op of operations) {
      opByName[op.name?.trim()] = op._id
    }
    for (const o of filteredOrders) {
      const opName = parseDesc(o.description, '工序')
      let matchedId = opByName[opName]
      if (!matchedId) {
        const parts = opName.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
        for (const p of parts) {
          matchedId = opByName[p]
          if (matchedId) break
        }
      }
      if (matchedId) {
        groups[matchedId].orders.push(o)
        groups[matchedId].count++
      } else {
        unmatchedOrders.push(o)
      }
    }
  } else {
    for (const o of filteredOrders) {
      const opName = parseDesc(o.description, '工序') || '未分类'
      if (!groups[opName]) groups[opName] = { op: null, orders: [], count: 0, name: opName }
      groups[opName].orders.push(o)
      groups[opName].count++
    }
  }

  if (unmatchedOrders.length > 0) {
    groups['__unmatched__'] = {
      op: null, name: '未分类',
      orders: unmatchedOrders, count: unmatchedOrders.length,
    }
  }

  // 排序 + 空工序过滤
  let groupList = Object.entries(groups)
  if (!showEmpty && hasOps) {
    groupList = groupList.filter(([, g]) => g.count > 0)
  }

  // 排序逻辑
  groupList.sort((a, b) => {
    const na = a[1].name || a[1].op?.name || ''
    const nb = b[1].name || b[1].op?.name || ''
    if (na === '未分类') return 1
    if (nb === '未分类') return -1
    if (sortMode === 'count') return b[1].count - a[1].count
    if (sortMode === 'date') {
      const latestA = a[1].orders.reduce((max, o) => {
        const d = o.planned_end_date || o.created || ''
        return d > max ? d : max
      }, '')
      const latestB = b[1].orders.reduce((max, o) => {
        const d = o.planned_end_date || o.created || ''
        return d > max ? d : max
      }, '')
      // 降序（最新在前），空日期排最后
      if (!latestA && !latestB) return 0
      if (!latestA) return 1
      if (!latestB) return -1
      return latestB.localeCompare(latestA)
    }
    // name
    return na.localeCompare(nb)
  })

  const detailOrders = selectedOp ? (groups[selectedOp]?.orders || []) : []
  const maxCount = Math.max(...groupList.map(([,g]) => g.count), 1)

  // 部门列表
  const allDepts = [...new Set(orders.map(o => parseDesc(o.description, '部门') || '未知'))].sort()
  const wfCounts = {}
  for (const wf of WF_STEPS) wfCounts[wf] = orders.filter(o => (o.wf_status || '待处理') === wf).length
  const totalOps = operations.length || Object.keys(groups).length
  const activeOps = Object.values(groups).filter(g => g.count > 0).length

  // 搜索建议（从工序名称中匹配）
  function handleSearchChange(e) {
    const v = e.target.value
    setSearchText(v)
    if (!v.trim() || !hasOps) {
      setSuggestions([])
      setShowSuggestions(false)
      setSuggestionIdx(-1)
      return
    }
    const q = v.toLowerCase().trim()
    const matches = operations
      .filter(op => op.name?.toLowerCase().includes(q))
      .slice(0, 8)
    setSuggestions(matches)
    setShowSuggestions(matches.length > 0)
    setSuggestionIdx(-1)
  }

  const applySuggestion = (op) => {
    setSearchText(op.name || '')
    setShowSuggestions(false)
    setSuggestionIdx(-1)
  }

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSuggestionIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestionIdx >= 0 && suggestions[suggestionIdx]) {
        applySuggestion(suggestions[suggestionIdx])
      } else {
        setShowSuggestions(false)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // 批量推进
  async function handleBatchAdvance(key) {
    const g = groups[key]
    if (!g || g.count === 0) return
    const currentWf = g.orders[0]?.wf_status || '待处理'
    const allSame = g.orders.every(o => (o.wf_status || '待处理') === currentWf)
    if (!allSame && hasOps) {
      setMsg('⚠️ 该工序下工单工作流状态不一致，无法批量推进')
      setTimeout(() => setMsg(null), 3000)
      return
    }
    const result = await batchAdvance(g.orders, currentWf, setOrders)
    if (result) { setMsg(result); setTimeout(() => setMsg(null), 3000) }
  }

  return (
    <div className="p-6 space-y-5">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>工序看板</h1>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{orders.length} 条工单</span>
          <span>·</span>
          {hasOps ? <span>{activeOps}/{totalOps} 道工序</span> : <span>{groupList.length} 道工序</span>}
        </div>
      </div>

      {/* 工具栏：视图切换 + 排序 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 视图切换 */}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {[
            { v: 'grid', icon: '▦', label: '卡片' },
            { v: 'donut', icon: '◔', label: '环形图' },
            { v: 'bar', icon: '▊', label: '柱状图' },
          ].map(m => (
            <button key={m.v} onClick={() => setViewMode(m.v)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: viewMode === m.v ? 'var(--accent)' : 'transparent',
                color: viewMode === m.v ? '#fff' : 'var(--text-secondary)',
              }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* 排序切换 */}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {[
            { v: 'name', label: '名称' },
            { v: 'count', label: '工单数' },
            { v: 'date', label: '时间' },
          ].map(m => (
            <button key={m.v} onClick={() => setSortMode(m.v)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: sortMode === m.v ? 'var(--accent-glow)' : 'transparent',
                color: sortMode === m.v ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              {sortMode === m.v ? '● ' : ''}{m.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* 空工序开关 */}
        {hasOps && viewMode === 'grid' && (
          <button onClick={() => setShowEmpty(v => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border transition-all"
            style={{
              background: showEmpty ? 'var(--accent-glow)' : 'var(--bg-secondary)',
              color: showEmpty ? 'var(--accent)' : 'var(--text-secondary)',
              borderColor: showEmpty ? 'var(--accent)' : 'var(--border)',
            }}>
            {showEmpty ? '● 显示全部' : '○ 隐藏空工序'}
          </button>
        )}
      </div>

      {/* 搜索栏 + autocomplete */}
      <div className="glass rounded-xl p-3 card-border">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]" ref={suggestRef}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>🔍</span>
            <input
              ref={searchRef}
              value={searchText}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
              placeholder="搜索编号、物料、客户、工序..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs outline-none"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
            />

            {/* Autocomplete 下拉 */}
            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border overflow-hidden z-50 shadow-xl"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                {suggestions.map((op, i) => (
                  <div key={op._id}
                    onClick={() => applySuggestion(op)}
                    onMouseEnter={() => setSuggestionIdx(i)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-all"
                    style={{
                      background: i === suggestionIdx ? 'var(--bg-card-hover)' : 'transparent',
                      color: i === suggestionIdx ? 'var(--accent)' : 'var(--text-secondary)',
                      borderLeft: i === suggestionIdx ? '2px solid var(--accent)' : '2px solid transparent',
                    }}>
                    <span style={{ color: 'var(--text-muted)' }}>▸</span>
                    <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{op.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{op.operation_code || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-lg border text-xs outline-none"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            <option value="all">全部部门</option>
            {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {(searchText || filterDept !== 'all') && (
            <button onClick={() => { setSearchText(''); setFilterDept('all'); setShowSuggestions(false) }}
              className="text-xs px-3 py-2 rounded-lg glass" style={{ color: 'var(--text-secondary)' }}>
              清除
            </button>
          )}

          <div className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            匹配 {filteredOrders.length} / {orders.length} 条
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {msg && (
        <div className="glass rounded-xl p-3 text-sm font-medium text-center"
          style={{ background: msg.startsWith('⚠') ? 'var(--accent-orange-bg)' : 'var(--accent-green-bg)',
                   color: msg.startsWith('⚠') ? 'var(--accent-orange)' : 'var(--accent-green)' }}>{msg}</div>
      )}

      {/* 工作流状态统计条 */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setWfFilter('all')}
          className={'px-4 py-2 rounded-lg text-xs font-medium transition-all ' +
            (wfFilter === 'all' ? 'bg-[var(--accent)] text-white' : 'glass text-[var(--text-secondary)]')}>
          全部 ({orders.length})
        </button>
        {WF_STEPS.filter(w => wfCounts[w] > 0).map(w => (
          <button key={w} onClick={() => setWfFilter(w)}
            className={'px-4 py-2 rounded-lg text-xs font-medium transition-all ' +
              (wfFilter === w ? 'glass text-white' : 'glass text-[var(--text-secondary)]')}
            style={wfFilter === w ? { background: WF_COLORS[WF_STEPS.indexOf(w)] } : {}}>
            {w} ({wfCounts[w]})
          </button>
        ))}
      </div>

      {/* ==== 主视图区域 ==== */}

      {/* 环形图 */}
      {viewMode === 'donut' && (
        <DonutView groupList={groupList} totalOrders={filteredOrders.length} onSelect={(key) => setSelectedOp(key)} />
      )}

      {/* 柱状图 */}
      {viewMode === 'bar' && (
        <BarView groupList={groupList} maxCount={maxCount} onSelect={(key) => setSelectedOp(key)} />
      )}

      {/* 卡片网格 */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {groupList.map(([key, g], idx) => {
            const opName = g.name || g.op?.name || '未分类'
            const opCode = g.op?.operation_code || ''
            const count = g.count
            const isEmpty = count === 0
            const currentWf = !isEmpty ? (g.orders[0]?.wf_status || '待处理') : '待处理'
            const allSame = g.orders.every(o => (o.wf_status || '待处理') === currentWf)
            const canAdvance = !isEmpty && allSame && currentWf !== '完工'

            return (
              <div key={key}
                onClick={() => setSelectedOp(selectedOp === key ? null : key)}
                className={'card-border glass rounded-xl p-5 cursor-pointer transition-all relative overflow-hidden ' +
                  (!isEmpty ? 'hover:scale-[1.02]' : 'opacity-60')}
                style={{ borderColor: selectedOp === key ? getColor(idx % CHART_COLORS.length) : undefined }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                       style={{ background: `linear-gradient(135deg, ${getColor(idx)}, ${getColor(idx+1)})` }}>
                    {opName.slice(0, 1)}
                  </div>
                  <span className={'text-2xl font-bold ' + (isEmpty ? '' : 'stat-value')}>{count}</span>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{opName}</div>
                  {opCode && <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{opCode}</div>}
                </div>

                {!isEmpty && (
                  <>
                    <div className="flex items-center gap-1 mt-2">
                      {WI_STEPS.map((w, wi) => {
                        const sc = g.orders.filter(o => (o.wf_status || '待处理') === w).length
                        return (
                          <div key={w} className="flex-1 h-1.5 rounded-full" style={{
                            background: sc > 0 ? WF_COLORS[wi + 1] : 'var(--border)',
                            opacity: sc > 0 ? 1 : 0.3,
                          }} />
                        )
                      })}
                    </div>
                    <div className="text-[10px] mt-1 flex justify-between" style={{ color: 'var(--text-muted)' }}>
                      <span>派工 {g.orders.filter(o => (o.wf_status || '待处理') === '派工').length}</span>
                      <span>送工 {g.orders.filter(o => (o.wf_status || '待处理') === '送工').length}</span>
                      <span>开工 {g.orders.filter(o => (o.wf_status || '待处理') === '开工').length}</span>
                      <span>完工 {g.orders.filter(o => (o.wf_status || '待处理') === '完工').length}</span>
                    </div>

                    {canAdvance && (
                      <div className="mt-2" onClick={e => { e.stopPropagation(); handleBatchAdvance(key) }}>
                        <button className="w-full py-1.5 rounded-lg text-xs font-medium glass-hover"
                          style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                          批量 → {WF_STEPS[WF_STEPS.indexOf(currentWf) + 1]}
                        </button>
                      </div>
                    )}
                  </>
                )}
                <div className="scan-line" style={{ animationDelay: Math.random() * 3 + 's' }} />
              </div>
            )
          })}
          {groupList.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
              {searchText || filterDept !== 'all' ? '没有匹配的工单' : '暂无数据'}
            </div>
          )}
        </div>
      )}

      {/* 详情列表（非 grid 视图也能触发，但只有 grid 有卡片点击） */}
      {selectedOp && detailOrders.length > 0 && (
        <div className="card-border glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {groups[selectedOp]?.name || groups[selectedOp]?.op?.name || '未分类'}
              </span>
              <span className="text-xs stat-value">{detailOrders.length} 条</span>
            </div>
            <button onClick={() => setSelectedOp(null)}
              className="text-xs px-3 py-1 rounded-lg glass" style={{ color: 'var(--text-secondary)' }}>
              收起
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>物料名称</th>
                  <th>编号</th>
                  <th>数量</th>
                  <th>工作流</th>
                  <th>车间</th>
                  <th>负责人</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {detailOrders.map((o, i) => {
                  const currentWf = o.wf_status || '待处理'
                  const wfIdx = WF_STEPS.indexOf(currentWf)
                  const canAdvance = wfIdx >= 0 && wfIdx < WF_STEPS.length - 1
                  return (
                    <tr key={o._id || i}>
                      <td className="font-medium">{o.name || '-'}</td>
                      <td><span className="font-mono text-xs">{o.order_number || '-'}</span></td>
                      <td>{o.quantity || '-'}</td>
                      <td>{wfTag(currentWf)}</td>
                      <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>{parseDesc(o.description, '部门')}</td>
                      <td className="text-xs">{parseDesc(o.description, '负责人')}</td>
                      <td>
                        {canAdvance && (
                          <button onClick={() => advanceWf(o, setOrders)}
                            className="text-xs px-2 py-1 rounded-lg font-medium"
                            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                            → {WF_STEPS[wfIdx + 1]}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
