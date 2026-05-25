const http = require('http');
const q = JSON.stringify({query:'{_health}'});
const req = http.request('http://localhost:5100/graphql', {
  method:'POST',
  headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(q)}
}, res => {
  let d=''; res.on('data',c=>d+=c); res.on('end',() => {
    console.log('Status:', res.statusCode);
    console.log('Response:', d.slice(0,1000));
  });
});
req.on('error',e=>console.log('Error:',e.message));
req.write(q); req.end();
