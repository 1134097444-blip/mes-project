const http = require('http');
let n = 0;
function check() {
  n++;
  http.get('http://localhost:5100/api/v6/health', { timeout: 8000 }, r => {
    let d = ''; r.on('data', x => d += x);
    r.on('end', () => { if (r.statusCode === 200) { console.log('UP'); test(); return; } if (n < 20) setTimeout(check, 5000); });
  }).on('error', () => { if (n < 20) setTimeout(check, 5000); }).on('timeout', function () { this.destroy(); if (n < 20) setTimeout(check, 5000); });
}
function test() {
  const{execSync}=require('child_process');
  execSync('node tests/fix.js',{cwd:'E:\\Object\\my-project\\mes-project',stdio:'pipe'});
  const b = JSON.stringify({ username: '1134097444@qq.com', password: '123456' });
  const q = http.request('http://localhost:5100/api/v6/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } }, r => {
    let d = ''; r.on('data', x => d += x); r.on('end', () => {
      const ck = r.headers['set-cookie'].join('; ');
      http.get('http://localhost:5100/api/v6/pages/schema/object?app=mes&objectApiName=mes_work_orders', { headers: { Cookie: ck } }, r2 => {
        let d2 = ''; r2.on('data', x => d2 += x); r2.on('end', () => {
          try {
            const j = JSON.parse(d2);
            console.log('Status:', r2.statusCode);
            console.log('Has fields:', !!j.fields, 'Count:', j.fields ? Object.keys(j.fields).length : 0);
            console.log('Has list_views:', !!j.list_views);
            if (!j.fields) console.log('Body:', d2.slice(0, 300));
          } catch (e) { console.log('Parse error:', d2.slice(0, 200)); }
        });
      }).on('error', e => console.log('ERR:', e.message));
    });
  });
  q.write(b); q.end();
}
check();
