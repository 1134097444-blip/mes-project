/**
 * MES 便携式前端服务
 * 解压即用：启动 HTTP 服务 + 打开浏览器 + 代理 API
 *
 * 编译成 exe:
 *   npm install -g pkg
 *   pkg port_server.js --targets node18-win-x64 --output mes-frontend.exe
 *
 * 目录结构（打包后）：
 *   mes-frontend/
 *   ├── mes-frontend.exe    ← 本文件编译后
 *   └── dist/               ← npm run build 输出
 *       ├── index.html
 *       └── assets/
 *
 * 双击 exe 即可访问 http://localhost:5173
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 5173;
const STEEDOS_HOST = 'localhost';
const STEEDOS_PORT = 5100;

// 获取 exe 所在目录（兼容编译后路径）
const ROOT = path.dirname(process.execPath || __dirname);
const DIST_DIR = path.join(ROOT, 'dist');

// MIME 类型
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 单页应用：所有非文件请求返回 index.html
      fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(500);
          res.end('500 Internal Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(indexData);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function proxySteedos(req, res) {
  const options = {
    hostname: STEEDOS_HOST,
    port: STEEDOS_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: STEEDOS_HOST + ':' + STEEDOS_PORT },
  };

  // 删除代理特有的头部
  delete options.headers['proxy-connection'];

  const proxyReq = http.request(options, (proxyRes) => {
    // 转发响应头
    const headers = { ...proxyRes.headers };
    delete headers['transfer-encoding']; // node 自动处理
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Steedos 后端未启动 (' + e.message + ')\n请先启动 start_server.bat');
  });

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

const server = http.createServer((req, res) => {
  const url = req.url;

  // API 请求 → 代理到 Steedos (5100)
  if (url.startsWith('/api/') || url.startsWith('/service/') || url.startsWith('/accounts/')) {
    return proxySteedos(req, res);
  }

  // 静态文件 → 从 dist/ 返回
  const filePath = url === '/' || url === '/index.html'
    ? path.join(DIST_DIR, 'index.html')
    : path.join(DIST_DIR, url);

  serveStatic(res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  const msg = `
╔═══════════════════════════════════════════╗
║         MES 制造执行系统                   ║
║                                           ║
║  本地地址: http://localhost:${PORT}        ║
║  后端地址: http://${STEEDOS_HOST}:${STEEDOS_PORT}        ║
║                                           ║
║  测试账号:                                ║
║    管理员: zhanghao / 888888              ║
║    工长:   ligong   / 666666              ║
║    工人:   wangshi  / 123456              ║
╚═══════════════════════════════════════════╝
`;
  console.log(msg);

  // 自动打开浏览器
  try {
    exec('start http://localhost:' + PORT);
  } catch {}
});
