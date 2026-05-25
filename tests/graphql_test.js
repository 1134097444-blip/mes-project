const http = require('http');
const BASE='http://localhost:5100';
const loginQ = JSON.stringify({username:'1134097444@qq.com',password:'123456'});
const lr=http.request(BASE+'/api/v6/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(loginQ)}},res=>{
  let d='';res.on('data',c=>d+=c);res.on('end',()=>{
    const ck=res.headers['set-cookie'].join('; ');
    console.log('Login OK, got cookie');
    const gql=JSON.stringify({query:'{_health}'});
    const gr=http.request(BASE+'/graphql',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(gql),Cookie:ck}},res2=>{
      let d2='';res2.on('data',c=>d2+=c);res2.on('end',()=>{
        console.log('GraphQL Status:', res2.statusCode);
        console.log('Response:', d2.slice(0,2000));
      });
    });
    gr.on('error',e=>console.log('Error:',e.message));
    gr.write(gql);gr.end();
  });
});
lr.on('error',e=>console.log('Error:',e.message));
lr.write(loginQ);lr.end();
