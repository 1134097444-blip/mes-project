/**
 * PDA 生产服务器
 * 用法: node pda-server.js
 * 功能: 提供前端静态页面 + 代理 API 到 Steedos (5100)
 */
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const PORT = 4173;
const DIST = path.join(__dirname, 'frontend', 'web', 'dist');

const app = express();

// API 代理 → Steedos 5100
const proxy = createProxyMiddleware({
  target: 'http://localhost:5100',
  changeOrigin: true,
});
app.use('/api', proxy);
app.use('/service', proxy);
app.use('/accounts', proxy);

// 静态文件
app.use(express.static(DIST));

// SPA fallback
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/service') && !req.path.startsWith('/accounts')) {
    return res.sendFile(path.join(DIST, 'index.html'));
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PDA 服务器启动:`);
  console.log(`  地址: http://172.16.20.179:${PORT}`);
  console.log(`  API:  /api/* → localhost:5100`);
});
