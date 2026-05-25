const sql = require('mssql');
(async () => {
  try {
    await sql.connect({ server: '192.168.1.21', database: 'UFDATA_006_2025', user: 'rd01', password: 'triowin', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 30000 });
    
    const r = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'v_mom_orderdetail_ProcColMoIn'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('=== 视图字段结构 ===');
    r.recordset.forEach(c => console.log(c.COLUMN_NAME + ' | ' + c.DATA_TYPE + (c.CHARACTER_MAXIMUM_LENGTH ? '('+c.CHARACTER_MAXIMUM_LENGTH+')' : '') + ' | ' + c.IS_NULLABLE));
    
    const v = await sql.query(`
      SELECT definition FROM sys.sql_modules 
      WHERE object_id = OBJECT_ID('v_mom_orderdetail_ProcColMoIn')
    `);
    if (v.recordset.length > 0) {
      console.log('\n=== 视图 SQL 定义 ===');
      console.log(v.recordset[0].definition);
    }
    
    const d = await sql.query('SELECT TOP 5 * FROM v_mom_orderdetail_ProcColMoIn');
    console.log('\n=== TOP 5 样本数据 ===');
    console.log(JSON.stringify(d.recordset, null, 2));
    
    await sql.close();
  } catch(e) { console.error('ERROR:', e.message); }
})();
