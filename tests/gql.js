const http = require('http');
const B='http://localhost:5100';
const loginQ=JSON.stringify({username:'1134097444@qq.com',password:'123456'});
const lr=http.request(B+'/api/v6/auth/login',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(loginQ)}},res=>{
  let d='';res.on('data',c=>d+=c);res.on('end',()=>{
    const ck=res.headers['set-cookie'].join('; ');
    console.log('Login OK');
    const gql=JSON.stringify({query:'{apps{_id name label}}'});
    const gr=http.request(B+'/graphql',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(gql),Cookie:ck}},res2=>{
      let d2='';res2.on('data',c=>d2+=c);res2.on('end',()=>{
        console.log('GraphQL Status:', res2.statusCode);
        console.log('Response:', d2.slice(0,3000));
      });
    });
    gr.write(gql);gr.end();
  });
});
lr.write(loginQ);lr.end();
