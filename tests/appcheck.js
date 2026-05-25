const http = require('http');
const B='http://localhost:5100';
function post(p,d){return new Promise(r=>{const b=JSON.stringify(d);const q=http.request(B+p,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({s:s.statusCode,h:s.headers,b:d}));});q.on('error',e=>r({e}));q.write(b);q.end();});}
(async()=>{
  const login=await post('/api/v6/auth/login',{username:'1134097444@qq.com',password:'123456'});
  const ck=login.h['set-cookie'].join('; ');
  const pages=['mes_home','mes_workshop_board','mes_quality_board','mes_equipment_board'];
  for(const p of pages){
    const r=await new Promise(r=>http.get(B+`/api/v6/pages/schema/app?app=mes&pageId=${p}&formFactor=`,{headers:{Cookie:ck}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({s:s.statusCode,b:d}));}));
    console.log(`\n=== ${p} === Status: ${r.s}`);
    console.log(r.b.slice(0,800));
  }
})();
