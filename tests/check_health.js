const http = require('http');
const BASE = 'http://localhost:5100';
function get(p) {
  return new Promise(r => {
    http.get(BASE + p, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>r({s:res.statusCode,b:d.slice(0,600)})); }).on('error',e=>r({e:e.message}));
  });
}
(async()=>{
  const eps = ['/api/v6/health','/api/v6/pages/mes_home','/api/v6/pages/mes_workshop_board','/api/v6/data/mes_work_orders?skip=0&top=3'];
  for(const ep of eps) {
    const r = await get(ep);
    console.log(`\n=== ${ep} ===\nStatus: ${r.s}`);
    r.e ? console.log('Error:', r.e) : console.log('Body:', r.b);
  }
})();
