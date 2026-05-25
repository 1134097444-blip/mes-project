import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchWorkOrders } from '../api'
import { getCurrentUser } from '../auth'
import { login as apiLogin } from '../api'

function parseDesc(desc, key) {
  if (!desc) return '-'
  const m = desc.match(new RegExp(key + ':[^|]*[^|]'))
  return m ? m[0].replace(key + ':', '').trim() : '-'
}

export default function PDAWorker() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanCode, setScanCode] = useState('')
  const [scannedOrder, setScannedOrder] = useState(null)
  const [message, setMessage] = useState(null)
  const [scanMode, setScanMode] = useState(true)
  const [online, setOnline] = useState(navigator.onLine)
  const [pendingOffline, setPendingOffline] = useState(0)

  const inputRef = useRef(null)
  const user = getCurrentUser()
  const assignments = JSON.parse(localStorage.getItem('mes_assignments') || '{}')
  const myTasks = orders.filter(o => assignments[o._id] === user?.id)

  // 网络状态监听
  useEffect(() => {
    const goOnline = () => { setOnline(true); syncOfflineQueue() }
    const goOffline = () => { setOnline(false) }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  // 查询离线队列数量
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel()
      channel.port1.onmessage = (e) => {
        if (e.data?.type === 'SYNC_RESULT') {
          setPendingOffline(0)
          showMsg(`已同步 ${e.data.result.synced} 条离线报工`, 'ok')
        }
      }
      navigator.serviceWorker.controller.postMessage({ type: 'SYNC_OFFLINE' }, [channel.port2])
    }
  }, [])

  useEffect(() => {
    apiLogin().then(() => fetchWorkOrders(200)).then(o => {
      setOrders(o.data || [])
      setLoading(false)
    })
  }, [])

  // 页面加载后自动聚焦输入框
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading])

  // 扫码输入：直接读 e.target.value，不依赖 React state
  function handleInputChange(e) {
    const v = e.target.value
    setScanCode(v)
    // 如果包含回车符（扫码枪常带），立即处理
    const clean = v.replace(/[\r\n]/g, '')
    if (clean !== v && clean.trim()) {
      findOrder(clean.trim())
      setScanCode('')
    }
  }

  function handleScanKeyDown(e) {
    // 回车键：直接取输入框当前值
    if (e.key === 'Enter') {
      const val = e.target.value.trim()
      if (val) {
        findOrder(val)
        setScanCode('')
        e.preventDefault()
      }
    }
  }

  // 输入完成后自动触发（扫码枪快速输入后停顿200ms检测）
  useEffect(() => {
    if (scanCode.trim().length < 3) return
    const timer = setTimeout(() => {
      if (scanCode.trim()) {
        findOrder(scanCode.trim())
        setScanCode('')
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [scanCode])

  function findOrder(code) {
    const found = orders.find(o =>
      o.order_number === code ||
      o.order_number?.includes(code) ||
      o.name?.includes(code)
    )
    if (found) {
      const isMine = assignments[found._id] === user?.id
      setScannedOrder({ ...found, isMine })
      showMsg(isMine ? '✅ 已找到工单' : '⚠️ 该工单不属于你', isMine ? 'ok' : 'warn')
    } else {
      setScannedOrder(null)
      showMsg('❌ 未找到工单: ' + code, 'err')
    }
  }

  function showMsg(text, type) {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 2500)
  }

  // 离线报工：存入 Service Worker 队列
  async function saveOffline(action, order) {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      showMsg('离线功能不可用', 'err')
      return
    }
    const token = sessionStorage.getItem('mes_api_token')
    const payload = {
      action,
      orderId: order._id,
      orderName: order.name,
      orderNumber: order.order_number,
      data: action === 'report' ? {
        name: order.name + '-报工',
        work_order: order._id,
        good_qty: order.quantity || 1,
        report_date: new Date().toISOString(),
      } : { status: action === 'start' ? '生产中' : '已完成' },
      token,
    }
    const channel = new MessageChannel()
    channel.port1.onmessage = (e) => {
      if (e.data?.type === 'OFFLINE_SAVED') {
        setPendingOffline(prev => prev + 1)
        showMsg('📦 已暂存（离线）: ' + order.name, 'warn')
      }
    }
    navigator.serviceWorker.controller.postMessage(
      { type: 'OFFLINE_REPORT', payload },
      [channel.port2]
    )
  }

  // 同步离线队列
  async function syncOfflineQueue() {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
    const channel = new MessageChannel()
    channel.port1.onmessage = (e) => {
      if (e.data?.type === 'SYNC_RESULT') {
        setPendingOffline(0)
        if (e.data.result.synced > 0) {
          showMsg(`📤 已自动同步 ${e.data.result.synced} 条离线报工`, 'ok')
        }
      }
    }
    navigator.serviceWorker.controller.postMessage({ type: 'SYNC_OFFLINE' }, [channel.port2])
  }

  async function startWork(order) {
    if (!online) {
      await saveOffline('start', order)
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: '生产中' } : o))
      setScannedOrder(prev => prev?._id === order._id ? { ...prev, status: '生产中' } : prev)
      return
    }
    try {
      await updateOrderStatus(order._id, '生产中')
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: '生产中' } : o))
      setScannedOrder(prev => prev?._id === order._id ? { ...prev, status: '生产中' } : prev)
      showMsg('🔨 开始干活: ' + order.name, 'ok')
    } catch {
      showMsg('更新失败，请重试', 'err')
    }
  }

  async function reportDone(order) {
    if (!online) {
      await saveOffline('report', order)
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: '已完成' } : o))
      setScannedOrder(prev => prev?._id === order._id ? { ...prev, status: '已完成' } : prev)
      return
    }
    try {
      await updateOrderStatus(order._id, '已完成')
      await createProductionReport(order)
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: '已完成' } : o))
      setScannedOrder(prev => prev?._id === order._id ? { ...prev, status: '已完成' } : prev)
      showMsg('✅ 报工成功: ' + order.name, 'ok')
    } catch {
      showMsg('报工失败，请重试', 'err')
    }
  }

  async function updateOrderStatus(oid, status) {
    const token = sessionStorage.getItem('mes_api_token')
    await fetch('/api/v6/data/mes_work_orders/' + oid, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status }),
    })
  }

  async function createProductionReport(order) {
    const token = sessionStorage.getItem('mes_api_token')
    await fetch('/api/v6/data/mes_production_reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        name: order.name + '-报工',
        work_order: order._id,
        good_qty: order.quantity || 1,
        report_date: new Date().toISOString(),
      }),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080b1a' }}>
        <div className="loading-ring w-12 h-12" />
      </div>
    )
  }

  const inProgress = myTasks.filter(o => o.status?.includes('生产')).length
  const done = myTasks.filter(o => o.status?.includes('完成') || o.status?.includes('关闭')).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080b1a', color: '#e0e8f0' }}>
      {/* 顶部状态栏 */}
      <header className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ background: '#0d1029', borderBottom: '1px solid rgba(56,152,236,0.2)' }}>
        <div className="flex items-center gap-2">
          <div>
            <div className="text-base font-semibold">{user?.name} · PDA</div>
            <div className="text-xs" style={{ color: '#4a5270' }}>{myTasks.length} 条任务</div>
          </div>
          {/* 网络状态指示 */}
          <span className={`inline-block w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`}
            title={online ? '在线' : '离线'} />
        </div>
        <div className="flex items-center gap-3 text-xs">
          {!online && pendingOffline > 0 && (
            <span style={{ color: '#ff9100' }}>📦 {pendingOffline}</span>
          )}
          <span style={{ color: '#00e676' }}>▶ {inProgress}</span>
          <span style={{ color: '#3898ec' }}>✓ {done}</span>
        </div>
      </header>

      {/* 离线提示条 */}
      {!online && (
        <div className="px-3 py-2 text-xs text-center font-medium"
          style={{ background: 'rgba(255,145,0,0.15)', color: '#ff9100' }}>
          📡 网络不可用 · 报工将暂存本地，联网后自动提交
        </div>
      )}

      {/* 消息提示 */}
      {message && (
        <div className="mx-3 mt-2 p-3 rounded-lg text-sm text-center font-medium" style={{
          background: message.type === 'ok' ? 'rgba(0,230,118,0.15)' :
                     message.type === 'warn' ? 'rgba(255,145,0,0.15)' :
                     'rgba(255,23,68,0.15)',
          color: message.type === 'ok' ? '#00e676' :
                 message.type === 'warn' ? '#ff9100' :
                 '#ff1744',
        }}>
          {message.text}
        </div>
      )}

      {/* 扫码输入区域 — 始终显示 */}
      <div className="p-3">
        <div className="rounded-xl p-4" style={{ background: '#0d1029', border: '1px solid rgba(56,152,236,0.2)' }}>
          <label className="text-xs font-medium mb-2 block" style={{ color: '#8892a8' }}>
            📷 扫码 / 输入工单编号
          </label>
          <input
            ref={inputRef}
            value={scanCode}
            onChange={handleInputChange}
            onKeyDown={handleScanKeyDown}
            placeholder="扫描条码或手动输入..."
            autoFocus
            style={{
              width: '100%',
              padding: '16px 12px',
              fontSize: '18px',
              borderRadius: '10px',
              border: '1px solid rgba(56,152,236,0.3)',
              background: '#080b1a',
              color: '#e0e8f0',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* 扫码结果 */}
      {scannedOrder && (
        <div className="mx-3 mb-2 rounded-xl p-4" style={{ background: '#0d1029', border: '1px solid rgba(56,152,236,0.2)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-semibold truncate flex-1">{scannedOrder.name}</div>
            <span className="text-xs ml-2 px-2 py-1 rounded-lg" style={{
              background: scannedOrder.status?.includes('生产') ? 'rgba(0,230,118,0.15)' : 'rgba(255,145,0,0.15)',
              color: scannedOrder.status?.includes('生产') ? '#00e676' : '#ff9100',
            }}>
              {scannedOrder.status || '待处理'}
            </span>
          </div>
          <div className="text-sm space-y-1" style={{ color: '#8892a8' }}>
            <div>编号: {scannedOrder.order_number}</div>
            <div>数量: {scannedOrder.quantity} 件</div>
            <div>工序: {parseDesc(scannedOrder.description, '工序')}</div>
          </div>

          {/* 操作按钮 — 大按钮 */}
          <div className="flex gap-3 mt-4">
            {(!scannedOrder.status?.includes('生产') && !scannedOrder.status?.includes('完成')) && scannedOrder.isMine && (
              <button onClick={() => startWork(scannedOrder)}
                style={{
                  flex: 1, padding: '16px', fontSize: '17px', fontWeight: '600',
                  borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #3898ec, #6c63ff)',
                  color: '#fff',
                }}>
                {online ? '🔨 开始干活' : '📦 离线开始'}
              </button>
            )}
            {scannedOrder.status?.includes('生产') && scannedOrder.isMine && (
              <button onClick={() => reportDone(scannedOrder)}
                style={{
                  flex: 1, padding: '16px', fontSize: '17px', fontWeight: '600',
                  borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #00e676, #10b981)',
                  color: '#fff',
                }}>
                {online ? '✅ 完成报工' : '📦 离线报工'}
              </button>
            )}
            {!scannedOrder.isMine && (
              <div style={{
                flex: 1, padding: '16px', fontSize: '15px', fontWeight: '500',
                borderRadius: '12px', textAlign: 'center',
                background: 'rgba(255,145,0,0.15)', color: '#ff9100',
              }}>
                ⚠️ 非本人任务
              </div>
            )}
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="flex-1 overflow-auto px-3 pb-3">
        <div className="text-xs font-semibold mb-2" style={{ color: '#4a5270' }}>我的任务 ({myTasks.length})</div>

        {myTasks.length === 0 ? (
          <div className="text-center py-12" style={{ background: '#0d1029', borderRadius: '12px', border: '1px solid rgba(56,152,236,0.1)' }}>
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm" style={{ color: '#8892a8' }}>暂无任务</div>
            <div className="text-xs mt-1" style={{ color: '#4a5270' }}>请联系工长分配</div>
          </div>
        ) : (
          <div className="space-y-2">
            {myTasks.map((o, i) => (
              <div key={o._id || i}
                onClick={() => { findOrder(o.order_number); setScanMode(true) }}
                className="rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
                style={{ background: '#0d1029', border: '1px solid rgba(56,152,236,0.15)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium truncate flex-1">{o.name}</div>
                  <span className="text-xs px-2 py-0.5 rounded-lg" style={{
                    background: o.status?.includes('生产') ? 'rgba(0,230,118,0.15)' :
                               o.status?.includes('完成') ? 'rgba(56,152,236,0.15)' :
                               'rgba(255,145,0,0.15)',
                    color: o.status?.includes('生产') ? '#00e676' :
                           o.status?.includes('完成') ? '#3898ec' :
                           '#ff9100',
                  }}>
                    {o.status || '待处理'}
                  </span>
                </div>
                <div className="flex justify-between text-xs" style={{ color: '#8892a8' }}>
                  <span>数量: {o.quantity}</span>
                  <span>{parseDesc(o.description, '工序')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <footer className="px-4 py-3 shrink-0" style={{ background: '#0d1029', borderTop: '1px solid rgba(56,152,236,0.2)' }}>
        <div className="flex justify-around text-center text-sm">
          <div>
            <div className="text-lg font-bold" style={{ color: '#3898ec' }}>{myTasks.length}</div>
            <div style={{ color: '#4a5270', fontSize: '11px' }}>总任务</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: '#00e676' }}>{inProgress}</div>
            <div style={{ color: '#4a5270', fontSize: '11px' }}>生产中</div>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: '#3898ec' }}>{done}</div>
            <div style={{ color: '#4a5270', fontSize: '11px' }}>已完成</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
