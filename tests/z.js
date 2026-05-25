const h=require('http');
(async()=>{
const b=JSON.stringify({username:'1134097444@qq.com',password:'123456'});
const L=await new Promise(r=>{const q=h.request('http://localhost:5100/api/v6/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({h:s.headers,t:JSON.parse(d).access_token}))});q.write(b);q.end()});
const t=L.t;const ck=L.h['set-cookie'].join('; ');
const tests=[
{name:'uiSchema Bearer',url:'/service/api/@mes_work_orders/uiSchema',headers:{Authorization:'Bearer '+t}},
{name:'uiSchema Cookie',url:'/service/api/@mes_work_orders/uiSchema',headers:{Cookie:ck}},
{name:'Data Bearer',url:'/api/v6/data/mes_work_orders?skip=0&top=1',headers:{Authorization:'Bearer '+t}},
];
for(const test of tests){
const r=await new Promise(r2=>{h.get('http://localhost:5100'+test.url,{headers:test.headers,timeout:10000},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r2({s:s.statusCode,b:d.slice(0,300)}))}).on('error',e=>r2({e:e.message}))});
const ok=r.b&&!r.b.includes('not found')&&(r.b.includes('fields')||r.b.includes('data')||r.b.length>50);
console.log(test.name,r.s,ok?'✅':'❌',r.b.slice(0,120));
}})();
