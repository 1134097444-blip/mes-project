const sql = require('mssql');
(async () => {
  try {
    await sql.connect({ server: '192.168.1.21', database: 'UFDATA_006_2025', user: 'rd01', password: 'triowin', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 30000 });
    
    const v = await sql.query(`
      SELECT definition FROM sys.sql_modules 
      WHERE object_id = OBJECT_ID('dbo.v_mom_orderdetail_ProcColMoIn')
    `);
    if (v.recordset.length > 0) {
      console.log(v.recordset[0].definition);
    } else {
      // Try with schema
      const v2 = await sql.query(`
        SELECT OBJECT_DEFINITION(OBJECT_ID('v_mom_orderdetail_ProcColMoIn')) AS def
      `);
      console.log('OBJECT_DEFINITION:', v2.recordset[0]?.def || 'NULL');
      
      // Try listing all v_mom views
      const views = await sql.query(`
        SELECT TABLE_SCHEMA, TABLE_NAME 
        FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_NAME LIKE '%ProcColMoIn%'
      `);
      console.log('Views found:', JSON.stringify(views.recordset));
    }
    await sql.close();
  } catch(e) { console.error('ERROR:', e.message); }
})();
