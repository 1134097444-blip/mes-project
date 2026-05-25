/**
 * 前端用户管理（角色 + 权限）
 * 登录验证在前端完成，API 调用使用 Steedos 统一账号
 */
const USERS = [
  { id: 'zhanghao', name: '张浩', password: '888888', role: 'admin' },
  { id: 'ligong', name: '李工', password: '666666', role: 'foreman' },
  { id: 'wangshi', name: '王师傅', password: '123456', role: 'worker' },
];

let currentUser = null;

export function login(uid, password) {
  const user = USERS.find(u => u.id === uid && u.password === password);
  if (!user) return null;
  currentUser = { ...user };
  sessionStorage.setItem('mes_user', JSON.stringify(currentUser));
  return currentUser;
}

export function logout() {
  currentUser = null;
  sessionStorage.removeItem('mes_user');
}

export function getCurrentUser() {
  if (currentUser) return currentUser;
  const saved = sessionStorage.getItem('mes_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      return currentUser;
    } catch {}
  }
  return null;
}

export function isAdmin() { return getCurrentUser()?.role === 'admin'; }
export function isForeman() { return getCurrentUser()?.role === 'foreman'; }
export function isWorker() { return getCurrentUser()?.role === 'worker'; }

export { USERS };
