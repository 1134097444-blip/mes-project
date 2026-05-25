const http = require('http');
const BASE = 'http://localhost:5100';
function post(p,d){return new Promise(r=>{const b=JSON.stringify(d);const q=http.request(BASE+p,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({s:s.statusCode,h:s.headers,b:d}));});q.on('error',e=>r({e}));q.write(b);q.end();});}
function get(p,ck){return new Promise(r=>http.get(BASE+p,{headers:{Cookie:ck}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({s:s.statusCode,b:d}));}).on('error',e=>r({e})));}

(async()=>{
  const L = await post('/api/v6/auth/login',{username:'1134097444@qq.com',password:'123456'});
  const ck = L.h['set-cookie'].join('; ');

  // Check the internal page_versions object definition to see how 'page' field is defined
  console.log('=== Object definition for page_versions ===');
  const r = await get('/api/v6/data/objects?skip=0&top=10&filters=[["name","=","page_versions"]]', ck);
  const j = JSON.parse(r.b);
  console.log('Status:', r.s);
  console.log('Body:', j.b || JSON.stringify(j).slice(0, 500));
  
  // Check the page_versions object fields
  console.log('\n=== page_versions fields ===');
  const r2 = await get('/api/v6/data/object_fields?skip=0&top=10&filters=[["object","=","page_versions"]]', ck);
  const j2 = JSON.parse(r2.b);
  const fields = j2.data || j2;
  fields.forEach(f => console.log('  '+f.name+': type='+f.type+(f.reference_to ? ' ref='+f.reference_to : '')));
})();
