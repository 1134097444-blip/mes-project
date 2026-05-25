const http = require('http');
const BASE = 'http://localhost:5100';

(async () => {
  // Login
  const loginData = await new Promise((resolve) => {
    const b = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
    const r = http.request(BASE + '/api/v6/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, s => { let d = ''; s.on('data', c => d += c); s.on('end', () => resolve(JSON.parse(d))); });
    r.write(b); r.end();
  });
  const T = loginData.access_token;
  function g(path) {
    return new Promise((resolve) => {
      http.get(BASE + path, { headers: { 'Authorization': 'Bearer ' + T } }, s => {
        let d = ''; s.on('data', c => d += c); s.on('end', () => resolve(JSON.parse(d)));
      });
    });
  }

  // 1. mes_operations
  const opsRes = await g('/api/v6/data/mes_operations?skip=0&top=200&fields=name,operation_code');
  const ops = opsRes.data || [];
  console.log('=== mes_operations (' + ops.length + ' 条) ===');
  const opSet = new Set();
  ops.forEach(o => { opSet.add(o.name); console.log('  ' + o.name); });

  // 2. 工单中的工序名
  const ordRes = await g('/api/v6/data/mes_work_orders?skip=0&top=100&fields=description,order_number,name');
  const orders = ordRes.data || [];
  const descOps = [...new Set(orders.map(o => {
    const m = (o.description || '').match(/工序:([^|]*)/);
    return m ? m[1].trim() : '';
  }))].filter(Boolean);

  console.log('\n=== 工单中的工序名 (' + descOps.length + ' 个不同值) ===');
  descOps.forEach(op => console.log('  "' + op + '"'));

  // 3. 匹配
  console.log('\n=== 匹配检查 ===');
  let unmatched = [];
  descOps.forEach(op => {
    if (opSet.has(op) || opSet.has(op + ' ')) {
      console.log('  ✅ [' + op + ']');
    } else {
      console.log('  ❌ [' + op + '] → 未匹配');
      unmatched.push(op);
    }
  });

  if (unmatched.length > 0) {
    console.log('\n=== 未匹配工序 ===');
    unmatched.forEach(op => console.log('  ❌ "' + op + '"'));
  } else {
    console.log('\n✅ 全部匹配');
  }
})();
