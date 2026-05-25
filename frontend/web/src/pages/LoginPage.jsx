import { useState } from 'react'
import { login } from '../auth'

export default function LoginPage({ onLogin }) {
  const [uid, setUid] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (!uid || !password) {
      setError('请输入账号和密码')
      return
    }

    const user = login(uid, password)
    if (!user) {
      setError('账号或密码错误')
      return
    }

    onLogin(user)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080b1a] grid-bg">
      <div className="glass rounded-2xl p-8 w-full max-w-sm card-border">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3898ec] to-[#6c63ff] flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
            M
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">MES 制造执行系统</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">登录您的账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">账号</label>
            <input
              type="text"
              value={uid}
              onChange={e => setUid(e.target.value)}
              placeholder="zhanghao / ligong / wangshi"
              className="w-full px-4 py-2.5 rounded-lg bg-[#0d1029] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码"
              className="w-full px-4 py-2.5 rounded-lg bg-[#0d1029] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          {error && (
            <div className="text-xs text-[var(--accent-red)] bg-[var(--accent-red-bg)] px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#3898ec] to-[#6c63ff] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            登录
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] text-center mb-2">测试账号</p>
          <div className="text-[10px] text-[var(--text-secondary)] space-y-1 text-center">
            <div>系统管理员：zhanghao / 888888</div>
            <div>工长：ligong / 666666</div>
            <div>工人：wangshi / 123456</div>
          </div>
        </div>
      </div>
    </div>
  )
}
