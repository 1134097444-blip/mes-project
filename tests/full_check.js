/**
 * 全量页面验证测试
 * 遍历 MES 应用所有导航项，检查页面是否正常渲染
 */
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ headless: true, defaultViewport: { width: 1400, height: 900 } });
  const p = await b.newPage();
  const issues = [];
  const results = [];

  // 收集错误
  p.on('console', msg => {
    if (msg.type() === 'error') issues.push('[CONSOLE] ' + msg.text().slice(0, 150));
  });
  p.on('pageerror', err => issues.push('[PAGE_ERR] ' + err.message.slice(0, 150)));
  p.on('response', resp => {
    if (resp.status() >= 500) issues.push('[HTTP_' + resp.status() + '] ' + resp.url().slice(0, 120));
  });

  // 登录
  await p.goto('http://localhost:5100', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForSelector('#loginId', { timeout: 30000 });
  await p.waitForTimeout(1000);
  await p.fill('#loginId', '1134097444@qq.com');
  await p.fill('#password', '123456');
  await p.click('button[type="submit"]');
  await p.waitForURL('**/app**', { timeout: 30000 });
  await p.waitForTimeout(3000);
  results.push({ name: '登录', status: 'OK', detail: '' });

  // 遍历所有页面
  const pages = [
    { name: 'MES首页', url: '/app/mes/page_mes_home', type: 'page' },
    { name: '业务流程导航', url: '/app/mes/page_mes_process_flow', type: 'page' },
    { name: '车间工单看板', url: '/app/mes/page_mes_workshop_board', type: 'page' },
    { name: '质量统计看板', url: '/app/mes/page_mes_quality_board', type: 'page' },
    { name: '设备状态看板', url: '/app/mes/page_mes_equipment_board', type: 'page' },
    { name: '工人任务', url: '/app/mes/mes_tasks', type: 'object' },
    { name: '生产工单', url: '/app/mes/mes_work_orders', type: 'object' },
    { name: '报工记录', url: '/app/mes/mes_production_reports', type: 'object' },
    { name: '工艺路线', url: '/app/mes/mes_routings', type: 'object' },
    { name: '工序定义', url: '/app/mes/mes_operations', type: 'object' },
    { name: '工作中心', url: '/app/mes/mes_work_centers', type: 'object' },
    { name: '车间管理', url: '/app/mes/mes_workshops', type: 'object' },
    { name: 'BOM清单', url: '/app/mes/mes_bom_items', type: 'object' },
    { name: '检验记录', url: '/app/mes/mes_inspection_records', type: 'object' },
    { name: '缺陷登记', url: '/app/mes/mes_defects', type: 'object' },
    { name: '不合格处理', url: '/app/mes/mes_nonconformance', type: 'object' },
    { name: '设备台账', url: '/app/mes/mes_equipment', type: 'object' },
    { name: '维保记录', url: '/app/mes/mes_maintenance_records', type: 'object' },
    { name: '故障报修', url: '/app/mes/mes_equipment_faults', type: 'object' },
    { name: '物料主数据', url: '/app/mes/mes_materials', type: 'object' },
    { name: '线边库存', url: '/app/mes/mes_inventory', type: 'object' },
  ];

  for (const pg of pages) {
    await p.goto('http://localhost:5100' + pg.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForTimeout(3000);

    const info = await p.evaluate(() => {
      const body = document.body;
      if (!body) return { error: 'no body' };
      const text = body.innerText || '';
      const html = body.innerHTML || '';
      return {
        text_sample: text.replace(/\s+/g, ' ').slice(0, 300),
        html_len: html.length,
        has_error_ui: text.includes('Unexpected Application Error') || text.includes('接口报错'),
        has_list_view: html.includes('amis-list') || html.includes('list-view') || text.includes('暂无数据') || /显示\s*\d+/.test(text),
        sidebar_text: (document.querySelector('.sidebar') || document.querySelector('[class*=sidebar]') || {}).innerText?.slice(0, 100) || ''
      };
    });

    const status = info.has_error_ui ? 'FAIL' : 'OK';
    const detail = info.has_error_ui ? info.text_sample.slice(0, 80) : (info.has_list_view ? '有列表视图' : '页面加载');
    results.push({ name: pg.name, status, detail });

    if (info.has_error_ui) {
      issues.push('[PAGE_FAIL] ' + pg.name + ': ' + info.text_sample.slice(0, 150));
    }
  }

  // 输出结果
  console.log('\n=== 页面验证结果 ===\n');
  console.log('名称'.padEnd(16), '状态', '详情');
  console.log('-'.repeat(60));
  for (const r of results) {
    console.log(r.name.padEnd(16), r.status === 'OK' ? '✅' : '❌', r.detail.slice(0, 40));
  }

  const failCount = results.filter(r => r.status === 'FAIL').length;
  console.log(`\n总计: ${results.length} 页, 通过: ${results.length - failCount}, 失败: ${failCount}`);

  if (issues.length > 0) {
    console.log('\n=== 问题清单 ===');
    for (const issue of issues) console.log(issue);
  }

  await b.close();
  console.log('\n=== 测试结束 ===');
})();
