@echo off
chcp 65001 >nul
echo ===== MES PDA 连接修复工具 =====
echo.

:: 放行防火墙（需要管理员权限）
echo 步骤1: 添加防火墙规则（请用管理员身份运行此bat）
netsh advfirewall firewall add rule name="MES-Vite-5173" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1
if %errorlevel% equ 0 (echo [OK] 防火墙规则已添加) else (echo [!!] 需要管理员权限！右键bat选"以管理员身份运行")

echo.
echo 步骤2: 检查 Vite 是否在运行
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (echo [OK] Vite 服务运行中 ^(port 5173^)) else (echo [!!] Vite 未运行！新开一个终端窗口执行: cd frontend/web ^&^& npx vite --host 0.0.0.0 --port 5173)

echo.
echo 步骤3: 你的电脑局域网IP
ipconfig | findstr /c:"IPv4"
echo.
echo PDA浏览器输入: http://172.16.20.179:5173
echo PDA必须和电脑在同一个WiFi/网络下
echo.
pause
