const http = require('http');
const B='http://localhost:5100';
function post(p,d){return new Promise(r=>{const b=JSON.stringify(d);const q=http.request(B+p,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({s:s.statusCode,h:s.headers,b:d}));});q.on('error',e=>r({e}));q.write(b);q.end();});}
(async()=>{
  const login=await post('/api/v6/auth/login',{username:'1134097444@qq.com',password:'123456'});
  const ck=login.h['set-cookie'].join('; ');
  const r=await new Promise(r=>http.get(B+'/service/api/apps/menus?mobile=false',{headers:{Cookie:ck}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({b:d}));}));
  const data=JSON.parse(r.b);
  console.log('Total apps:', data.length);
  data.forEach(a=>console.log(`  ${a.id} | ${a.name} | path:${a.path} | children:${a.children?.length||0}`));
  const mes=data.find(a=>a.id==='mes');
  if(mes) console.log('\nMES children:\n'+JSON.stringify(mes.children?.map(c=>c.name+'('+c.path+')'),null,2));
})();
