/**
 * MES 前端测试 MCP 服务器
 * 
 * 强制前端测试通过 MCP 协议执行。
 * 提供自动化浏览器测试工具，测试通过才能继续。
 * 
 * 传输方式: stdio (JSON-RPC 2.0)
 * 
 * 依赖: playwright (已在项目依赖中)
 */
const { chromium } = require('playwright');
const http = require('http');
const readline = require('readline');

const BASE_URL = process.env.MES_BASE_URL || 'http://localhost:5100';
const LOGIN_USER = process.env.MES_LOGIN_USER || '1134097444@qq.com';
const LOGIN_PASS = process.env.MES_LOGIN_PASS || '123456';

// ============ MCP 协议实现 ============

class McpServer {
  constructor() {
    this.requestId = 0;
    this.initialized = false;
    this.rl = readline.createInterface({ input: process.stdin });
    this.rl.on('line', line => this.handleMessage(line.trim()));
  }

  send(msg) {
    process.stdout.write(JSON.stringify(msg) + '\n');
  }

  async handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // JSON-RPC 2.0 生命周期
    if (msg.method === 'initialize') {
      this.initialized = true;
      return this.send({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'mes-frontend-tester', version: '1.0.0' },
          capabilities: { tools: {} },
        },
      });
    }

    if (msg.method === 'notifications/initialized') {
      return;
    }

    if (msg.method === 'tools/list') {
      return this.send({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: this.getToolDefinitions() },
      });
    }

    if (msg.method === 'tools/call') {
      const { name, arguments: args } = msg.params || {};
      try {
        const result = await this.executeTool(name, args || {});
        const content = typeof result === 'string'
          ? [{ type: 'text', text: result }]
          : [{ type: 'text', text: JSON.stringify(result, null, 2) }];
        this.send({ jsonrpc: '2.0', id: msg.id, result: { content } });
      } catch (e) {
        this.send({
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32603, message: e.message, data: e.stack?.slice(0, 500) },
        });
      }
      return;
    }

    // method 不存在
    this.send({
      jsonrpc: '2.0',
      id: msg.id ?? null,
      error: { code: -32601, message: `Method not found: ${msg.method}` },
    });
  }

  getToolDefinitions() {
    return [
      {
        name: 'test_health',
        description: '检查 Steedos 服务是否存活',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'test_login',
        description: '测试登录页面和登录流程',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'test_page',
        description: '测试单个 MES 页面是否正常加载',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '页面路径，如 /app/mes/page_mes_home 或 /app/mes/mes_tasks' },
            waitMs: { type: 'number', description: '加载后等待毫秒数', default: 3000 },
          },
          required: ['path'],
        },
      },
      {
        name: 'test_all_pages',
        description: '测试所有 MES 页面（22 个）加载是否正常',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'test_ui_schema',
        description: '测试 MES 对象 uiSchema API 是否正常返回',
        inputSchema: {
          type: 'object',
          properties: {
            objectName: { type: 'string', description: '对象名称，如 mes_tasks', default: 'mes_tasks' },
          },
        },
      },
      {
        name: 'screenshot',
        description: '截取指定页面的截图',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '页面路径', default: '/app/mes/page_mes_home' },
            output: { type: 'string', description: '截图文件名', default: 'screenshot.png' },
          },
          required: ['path'],
        },
      },
    ];
  }

  async executeTool(name, args) {
    switch (name) {
      case 'test_health': return this.testHealth();
      case 'test_login': return this.testLogin();
      case 'test_page': return this.testPage(args.path, args.waitMs || 3000);
      case 'test_all_pages': return this.testAllPages();
      case 'test_ui_schema': return this.testUiSchema(args.objectName || 'mes_tasks');
      case 'screenshot': return this.takeScreenshot(args.path, args.output || 'screenshot.png');
      default: throw new Error(`Unknown tool: ${name}`);
    }
  }

  // ============ 测试工具实现 ============

  async testHealth() {
    const res = await this.httpGet('/api/v6/health');
    const ok = res.status === 200;
    return {
      status: ok ? 'PASS' : 'FAIL',
      endpoint: '/api/v6/health',
      httpStatus: res.status,
      body: res.body.slice(0, 200),
    };
  }

  async testLogin() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const issues = [];

    page.on('pageerror', err => issues.push({ type: 'page_error', msg: err.message.slice(0, 150) }));
    page.on('response', resp => {
      if (resp.status() >= 500) issues.push({ type: 'http_' + resp.status(), url: resp.url().slice(0, 100) });
    });

    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#loginId', { timeout: 10000 });
      await page.fill('#loginId', LOGIN_USER);
      await page.fill('#password', LOGIN_PASS);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);

      const currentUrl = page.url();
      const loggedIn = currentUrl.includes('/app') || currentUrl.includes('/home');

      // 检查是否有错误 UI
      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || '');
      const hasError = bodyText.includes('Unexpected Application Error') || bodyText.includes('接口报错');

      await browser.close();

      return {
        status: loggedIn && !hasError ? 'PASS' : 'FAIL',
        loginUrl: currentUrl.slice(0, 80),
        hasError,
        issues: issues.length > 0 ? issues.slice(0, 5) : [],
      };
    } catch (e) {
      await browser.close();
      return { status: 'FAIL', error: e.message.slice(0, 200) };
    }
  }

  async testPage(path, waitMs) {
    const loginCookie = await this.getLoginCookie();
    if (!loginCookie) return { status: 'SKIP', reason: '登录失败，无法测试页面' };

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const issues = [];

    page.on('pageerror', err => issues.push({ type: 'page_error', msg: err.message.slice(0, 150) }));
    page.on('response', resp => {
      if (resp.status() >= 500) issues.push({ type: 'http_' + resp.status(), url: resp.url().slice(0, 100) });
    });

    try {
      const url = path.startsWith('http') ? path : BASE_URL + path;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(waitMs);

      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');
      const htmlLen = await page.evaluate(() => document.body?.innerHTML?.length || 0);
      const hasError = bodyText.includes('Unexpected Application Error') || bodyText.includes('接口报错');

      await browser.close();

      return {
        status: hasError ? 'FAIL' : 'PASS',
        url: url.slice(0, 100),
        htmlLength: htmlLen,
        textSample: bodyText.slice(0, 200),
        issues: issues.length > 0 ? issues.slice(0, 5) : [],
      };
    } catch (e) {
      await browser.close();
      return { status: 'FAIL', error: e.message.slice(0, 200) };
    }
  }

  async testAllPages() {
    const loginCookie = await this.getLoginCookie();
    if (!loginCookie) return { status: 'SKIP', reason: '登录失败' };

    const pages = [
      { name: 'MES首页', url: '/app/mes/page_mes_home' },
      { name: '业务流程导航', url: '/app/mes/page_mes_process_flow' },
      { name: '车间工单看板', url: '/app/mes/page_mes_workshop_board' },
      { name: '质量统计看板', url: '/app/mes/page_mes_quality_board' },
      { name: '设备状态看板', url: '/app/mes/page_mes_equipment_board' },
      { name: '工人任务', url: '/app/mes/mes_tasks' },
      { name: '生产工单', url: '/app/mes/mes_work_orders' },
      { name: '报工记录', url: '/app/mes/mes_production_reports' },
      { name: '工艺路线', url: '/app/mes/mes_routings' },
      { name: '工序定义', url: '/app/mes/mes_operations' },
      { name: '工作中心', url: '/app/mes/mes_work_centers' },
      { name: '车间管理', url: '/app/mes/mes_workshops' },
      { name: 'BOM清单', url: '/app/mes/mes_bom_items' },
      { name: '检验记录', url: '/app/mes/mes_inspection_records' },
      { name: '缺陷登记', url: '/app/mes/mes_defects' },
      { name: '不合格处理', url: '/app/mes/mes_nonconformance' },
      { name: '设备台账', url: '/app/mes/mes_equipment' },
      { name: '维保记录', url: '/app/mes/mes_maintenance_records' },
      { name: '故障报修', url: '/app/mes/mes_equipment_faults' },
      { name: '物料主数据', url: '/app/mes/mes_materials' },
      { name: '线边库存', url: '/app/mes/mes_inventory' },
    ];

    const results = [];
    let passed = 0;
    let failed = 0;

    for (const pg of pages) {
      const result = await this.testPage(pg.url, 3000);
      results.push({ name: pg.name, status: result.status, issues: result.issues?.length || 0 });
      if (result.status === 'PASS') passed++;
      else failed++;
    }

    return {
      status: failed === 0 ? 'PASS' : 'FAIL',
      total: pages.length,
      passed,
      failed,
      results,
    };
  }

  async testUiSchema(objectName) {
    const login = await this.httpPost('/api/v6/auth/login', {
      username: LOGIN_USER,
      password: LOGIN_PASS,
    });
    if (login.status !== 200) {
      return { status: 'SKIP', reason: '登录失败: ' + login.body.slice(0, 100) };
    }

    const cookie = login.headers['set-cookie']?.join('; ') || '';
    const res = await this.asyncGet('/service/api/@' + objectName + '/uiSchema', cookie);

    let hasSchema = false;
    try {
      const parsed = JSON.parse(res.body);
      hasSchema = parsed && parsed._id === objectName;
    } catch {}

    return {
      status: res.status === 200 && hasSchema ? 'PASS' : 'FAIL',
      objectName,
      httpStatus: res.status,
      hasSchema,
    };
  }

  async takeScreenshot(path, output) {
    const loginCookie = await this.getLoginCookie();
    if (!loginCookie) return { status: 'SKIP', reason: '登录失败' };

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    try {
      const url = path.startsWith('http') ? path : BASE_URL + path;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      // 保存到 frontend 目录
      const fs = require('fs');
      const outputPath = require('path').join(__dirname, output);
      await page.screenshot({ path: outputPath, fullPage: true });
      await browser.close();

      const size = fs.statSync(outputPath).size;
      return {
        status: 'PASS',
        file: outputPath,
        sizeBytes: size,
      };
    } catch (e) {
      await browser.close();
      return { status: 'FAIL', error: e.message.slice(0, 200) };
    }
  }

  // ============ HTTP 工具 ============

  asyncGet(url, cookie) {
    return new Promise(r => {
      http.get(BASE_URL + url, { headers: cookie ? { Cookie: cookie } : {} }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => r({ status: res.statusCode, headers: res.headers, body: d }));
      });
    });
  }

  httpPost(url, data) {
    const body = JSON.stringify(data);
    return new Promise(r => {
      const q = http.request(BASE_URL + url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => r({ status: res.statusCode, headers: res.headers, body: d }));
      });
      q.write(body);
      q.end();
    });
  }

  async getLoginCookie() {
    const login = await this.httpPost('/api/v6/auth/login', {
      username: LOGIN_USER,
      password: LOGIN_PASS,
    });
    if (login.status !== 200) return null;
    return login.headers['set-cookie']?.join('; ') || null;
  }
}

// ============ 启动 ============

const server = new McpServer();
