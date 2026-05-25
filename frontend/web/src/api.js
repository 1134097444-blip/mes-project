/**
 * Steedos API 接口层
 */
const BASE = '';
const CREDENTIALS = { username: '1134097444@qq.com', password: '123456' };

let authToken = null;

export async function login() {
  if (authToken) return authToken;
  // 尝试从缓存恢复
  const saved = sessionStorage.getItem('mes_api_token');
  if (saved) {
    authToken = saved;
    return saved;
  }

  const res = await fetch(BASE + '/api/v6/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENTIALS),
  });

  if (!res.ok) throw new Error('API login failed: ' + res.status);

  const data = await res.json();
  authToken = data.access_token;
  sessionStorage.setItem('mes_api_token', authToken);
  return authToken;
}

export async function apiGet(path) {
  const token = await login();
  const res = await fetch(BASE + path, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (!res.ok) {
    // 令牌可能过期，清除重试一次
    sessionStorage.removeItem('mes_api_token');
    authToken = null;
    const newToken = await login();
    const retry = await fetch(BASE + path, {
      headers: { 'Authorization': 'Bearer ' + newToken },
    });
    return retry.json();
  }
  return res.json();
}

export async function apiPost(path, body) {
  const token = await login();
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ====== 数据获取函数 ======

export async function fetchWorkOrders(top = 50) {
  return apiGet('/api/v6/data/mes_work_orders?skip=0&top=' + top);
}

export async function fetchEquipment() {
  return apiGet('/api/v6/data/mes_equipment?skip=0&top=50');
}

export async function fetchWorkCenters() {
  return apiGet('/api/v6/data/mes_work_centers?skip=0&top=20');
}

export async function fetchWorkshops() {
  return apiGet('/api/v6/data/mes_workshops?skip=0&top=20');
}

export async function fetchProductionReports(top = 100) {
  return apiGet('/api/v6/data/mes_production_reports?skip=0&top=' + top);
}

export async function fetchTasks(top = 50) {
  return apiGet('/api/v6/data/mes_tasks?skip=0&top=' + top);
}

export async function fetchEquipmentFaults(top = 50) {
  return apiGet('/api/v6/data/mes_equipment_faults?skip=0&top=' + top);
}

export async function fetchOperations(top = 200) {
  return apiGet('/api/v6/data/mes_operations?skip=0&top=' + top);
}

export async function fetchAllDashboard() {
  const [orders, equip, reports, tasks, faults] = await Promise.all([
    fetchWorkOrders(200),
    fetchEquipment(),
    fetchProductionReports(100),
    fetchTasks(100),
    fetchEquipmentFaults(50),
  ]);
  return { orders, equip, reports, tasks, faults };
}
