const CACHE = 'mes-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/mes-icon.svg',
  '/manifest.json',
];

// ====== 安装：缓存核心资源 ======
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
});

// ====== 激活：清理旧缓存 ======
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  // 接管所有页面
  self.clients.claim();
});

// ====== 拦截请求 ======
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API 请求：网络优先，失败时返回缓存
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // 静态资源：缓存优先
  if (url.pathname.match(/\.(js|css|svg|png|jpg|ico|woff2?)$/)) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // 页面 / HTML：网络优先
  if (e.request.mode === 'navigate') {
    e.respondWith(networkFirst(e.request));
    return;
  }

  // 其他：网络优先 + 缓存兜底
  e.respondWith(networkFirst(e.request));
});

// ====== 缓存策略 ======

// 网络优先（API 调用、页面导航）
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, clone));
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // 离线且无缓存：返回离线页面
    return new Response(JSON.stringify({ error: 'offline', message: '网络不可用' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 缓存优先（静态资源）
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, clone));
    }
    return res;
  } catch {
    return new Response('', { status: 408 });
  }
}

// ====== 离线消息队列（PDA 报工离线暂存） ======
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'OFFLINE_REPORT') {
    // 存储离线报工记录到 IndexedDB
    saveOfflineReport(e.data.payload).then((id) => {
      e.ports[0]?.postMessage({ type: 'OFFLINE_SAVED', id });
    });
  }

  if (e.data && e.data.type === 'SYNC_OFFLINE') {
    // 尝试提交所有离线报工
    syncOfflineReports().then((result) => {
      e.ports[0]?.postMessage({ type: 'SYNC_RESULT', result });
    });
  }
});

// IndexedDB 离线存储
const DB_NAME = 'mes-offline';
const DB_VERSION = 1;
const STORE_NAME = 'reports';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineReport(payload) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.add({ ...payload, createdAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function syncOfflineReports() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const all = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const results = [];
  for (const record of all) {
    try {
      const res = await fetch('/api/v6/data/mes_production_reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (record.token || ''),
        },
        body: JSON.stringify(record.data),
      });
      if (res.ok) {
        results.push({ id: record.id, status: 'synced' });
        // 删除已同步的记录
        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        deleteTx.objectStore(STORE_NAME).delete(record.id);
      } else {
        results.push({ id: record.id, status: 'failed', error: res.status });
      }
    } catch {
      results.push({ id: record.id, status: 'failed', error: 'network' });
    }
  }
  return { total: all.length, synced: results.filter((r) => r.status === 'synced').length, failed: results.filter((r) => r.status === 'failed').length };
}
