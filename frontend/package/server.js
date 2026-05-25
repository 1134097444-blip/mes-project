/**
 * MES 便携式前端服务器（独立版）
 * 解压即用：cd 到 dist 同级目录 → node server.js
 * 自动打开浏览器 → 代理 API 到 Steedos 后端
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 5173;
const STEEDOS = { host: 'localhost', port: 5100 };

// 当前目录作为根目录
const DIR = __dirname;
const DIST = path.join(DIR, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

// 检查 dist 是否存在
if (!fs.existsSync(DIST) || !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('\n❌ 未找到 dist/index.html');
  console.error('   请先执行 npm run build 生成前端文件');
  console.error('   或确认 dist/ 目录存在\n');
  process.exit(1);
}

http.createServer((req, res) => {
  // API → 代理到 Steedos
  if (req.url.startsWith('/api/') || req.url.startsWith('/service/') || req.url.startsWith('/accounts/')) {
    const opt = {
      hostname: STEEDOS.host,
      port: STEEDOS.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: STEEDOS.host + ':' + STEEDOS.port },
    };
    delete opt.headers['proxy-connection'];

    const pr = http.request(opt, (prRes) => {
      const h = { ...prRes.headers };
      delete h['transfer-encoding'];
      res.writeHead(prRes.statusCode, h);
      prRes.pipe(res);
    });
    pr.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('❌ Steedos 后端未连接 (localhost:5100)\n请先启动 start_server.bat');
    });
    if (req.method !== 'GET' && req.method !== 'HEAD') req.pipe(pr);
    else pr.end();
    return;
  }

  // 静态文件 → 从 dist/ 返回
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(DIST, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback → index.html
      fs.readFile(path.join(DIST, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(500); res.end('500'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(idx);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  const url = 'http://localhost:' + PORT;
  console.log(`
╔═══════════════════════════════════════════╗
║         MES 制造执行系统                   ║
║                                           ║
║  打开: ${url}               ║
║  后端: localhost:${STEEDOS.port}                     ║
║                                           ║
║  管理员: zhanghao / 888888               ║
║  工长:   ligong   / 666666               ║
║  工人:   wangshi  / 123456               ║
╚═══════════════════════════════════════════╝
`);
  // 自动打开浏览器
  try {
    spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' });
  } catch {}
});
