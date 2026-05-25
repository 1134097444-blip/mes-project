/**
 * 快速诊断：服务状态
 */
const http = require('http');
const { execSync } = require('child_process');

function get(path, timeout = 5000) {
  return new Promise(resolve => {
    const req = http.get('http://localhost:5100' + path, { timeout }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.slice(0, 300) }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.on('error', e => resolve({ error: e.message }));
  });
}

(async () => {
  // Check process list for Steedos/Node
  try {
    const ps = execSync('wmic process where "name like \'%node%\'" get processid,commandline 2>nul', { timeout: 5000 }).toString();
    const lines = ps.split('\n').filter(l => l.includes('steedos') || l.includes('5100'));
    console.log('Steedos processes:');
    lines.forEach(l => console.log('  ' + l.trim().slice(0, 200)));
  } catch(e) {
    console.log('Process check error:', e.message);
  }

  // Check API endpoints
  console.log('\n=== API Checks ===\n');
  
  const r1 = await get('/api/v6/health');
  console.log('/api/v6/health:', r1.status || r1.error, r1.body?.slice(0, 60));

  const r2 = await get('/');
  console.log('/ (frontend):', r2.status || r2.error);

  const r3 = await get('/api/v6/data/mes_work_orders?skip=0&top=1');
  console.log('/api/v6/data/mes_work_orders:', r3.status || r3.error, r3.body?.slice(0, 60));

  const r4 = await get('/api/v6/pages/mes_home');
  console.log('/api/v6/pages/mes_home:', r4.status || r4.error, r4.body?.slice(0, 60));
})();
