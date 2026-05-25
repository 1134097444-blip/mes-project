const http = require('http');
const BASE = 'http://localhost:5100';
function post(p,d){return new Promise(r=>{const b=JSON.stringify(d);const q=http.request(BASE+p,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({s:s.statusCode,h:s.headers,b:d}));});q.on('error',e=>r({e}));q.write(b);q.end();});}
async function get(p,ck){return new Promise(r=>http.get(BASE+p,{headers:{Cookie:ck}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({s:s.statusCode,b:d}));}).on('error',e=>r({e})));}
(async()=>{
  const login=await post('/api/v6/auth/login',{username:'1134097444@qq.com',password:'123456'});
  const ck=login.h['set-cookie'].join('; ');
  
  console.log('=== REST API apps ===');
  const apps=await get('/api/v6/data/apps?skip=0&top=50',ck);
  const aj=JSON.parse(apps.b);
  aj.data.forEach(a=>{
    console.log(`\nApp: ${a.label} (${a.code || a.name})`);
    console.log(`  visible: ${a.visible}, _id: ${a._id}`);
    if(a.tabs) console.log(`  tabs count: ${a.tabs.length}, first: ${a.tabs[0]}`);
  });
  
  // 检查 GraphQL 的 apps 查询
  console.log('\n=== GraphQL apps ===');
  const gql=JSON.stringify({query:'{apps{_id name visible tabs}}'});
  const gr=await new Promise(r=>{const req=http.request(BASE+'/graphql',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(gql),Cookie:ck}},s=>{let d='';s.on('data',c=>d+=c);s.on('end',()=>r({s:s.statusCode,b:d}));});req.on('error',e=>r({e}));req.write(gql);req.end();});
  console.log('GQL Status:', gr.s);
  try{const g=JSON.parse(gr.b);console.log('GQL apps:', JSON.stringify(g.data?.apps?.slice(0,5)).slice(0,800));}catch(e){console.log('GQL body:',gr.b.slice(0,500));}

  // 检查用户的 roles
  console.log('\n=== Current user roles ===');
  const user=await get('/api/v6/data/space_users?skip=0&top=5',ck);
  const uj=JSON.parse(user.b);
  uj.data?.slice(0,3).forEach(u=>console.log(`  user:${u.user}, roles:${u.roles?.join(',')||'none'}, permission_set:${u.permission_set||'none'}`));
})();
