const sql = require('mssql');
(async() => {
  try {
    await sql.connect({
      server: '192.168.1.21', database: 'UFDATA_006_2025',
      user: 'rd01', password: 'triowin',
      options: { encrypt: false, trustServerCertificate: true },
      requestTimeout: 120000
    });
    console.log('Connected');
    for(const t of ['RdRecord','RdRecords','DispatchList','DispatchLists']){
      const r = await sql.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
      console.log(`${t.padEnd(35)} ${r.recordset[0].cnt}`);
    }
    await sql.close();
  } catch(e) { console.log('Error:', e.message.slice(0,500)); }
})();
