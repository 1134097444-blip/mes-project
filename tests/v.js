const http = require('http');
const urls = ['/api/v6/health', '/', '/home', '/app'];
(async () => {
  for (const url of urls) {
    const r = await new Promise(resolve => {
      const req = http.get('http://localhost:5100' + url, { timeout: 8000 }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve({ s: res.statusCode, len: d.length, d: d.slice(0,300) }));
      });
      req.on('error', e => resolve({ e: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ e: 'timeout' }); });
    });
    console.log(url, r.s || r.e, 'len=' + r.len);
    if (r.len) console.log('  ', r.d.replace(/\n/g, ' ').slice(0, 200));
  }
})();
