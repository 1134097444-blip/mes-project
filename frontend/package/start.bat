@echo off
chcp 65001 >nul
title MES 便携式前端

echo ╔═══════════════════════════════════════════╗
echo ║         MES 制造执行系统                   ║
echo ║                                           ║
echo ║  正在启动前端服务...                       ║
echo ╚═══════════════════════════════════════════╝
echo.

:: 切换到脚本所在目录
cd /d "%~dp0"

:: 启动 HTTP 服务 + 代理 → Steedos 后端
node server.js

echo.
echo 服务已停止。
pause
