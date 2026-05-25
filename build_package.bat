@echo off
chcp 65001 >nul
title MES 前端打包工具

echo ╔═══════════════════════════════════════════╗
echo ║      MES 前端打包工具                      ║
echo ║      生成解压即用的前端包                   ║
echo ╚═══════════════════════════════════════════╝
echo.

set ROOT=%~dp0..
set DIST_DIR=%ROOT%\frontend\web\dist
set OUTPUT_DIR=%ROOT%\frontend\package
set EXE=%ROOT%\frontend\mes-frontend.exe

echo [1/4] 前端生产构建...
cd /d %ROOT%\frontend\web
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✅ 构建完成

echo.
echo [2/4] 编译便携式服务程序...
call pkg %ROOT%\frontend\port_server.js --targets node18-win-x64 --output %EXE%
if %ERRORLEVEL% neq 0 (
    echo ❌ 编译失败
    pause
    exit /b 1
)
echo ✅ exe 已生成: %EXE%

echo.
echo [3/4] 打包发布目录...
if exist %OUTPUT_DIR% rmdir /s /q %OUTPUT_DIR%
mkdir %OUTPUT_DIR%

REM 复制 exe
copy %EXE% %OUTPUT_DIR%\ >nul

REM 复制 dist（前端静态文件）
xcopy %DIST_DIR% %OUTPUT_DIR%\dist\ /e /i /q >nul

REM 复制使用说明
echo MES 便携式前端 > %OUTPUT_DIR%\使用说明.txt
echo. >> %OUTPUT_DIR%\使用说明.txt
echo 使用方法: >> %OUTPUT_DIR%\使用说明.txt
echo 1. 确保 Steedos 后端已启动（start_server.bat） >> %OUTPUT_DIR%\使用说明.txt
echo 2. 双击 mes-frontend.exe >> %OUTPUT_DIR%\使用说明.txt
echo 3. 浏览器自动打开 http://localhost:5173 >> %OUTPUT_DIR%\使用说明.txt
echo. >> %OUTPUT_DIR%\使用说明.txt
echo 测试账号: >> %OUTPUT_DIR%\使用说明.txt
echo   管理员: zhanghao / 888888 >> %OUTPUT_DIR%\使用说明.txt
echo   工长:   ligong   / 666666 >> %OUTPUT_DIR%\使用说明.txt
echo   工人:   wangshi  / 123456 >> %OUTPUT_DIR%\使用说明.txt
echo. >> %OUTPUT_DIR%\使用说明.txt
echo 注意: 首次使用需先启动 start_server.bat 启动后端 >> %OUTPUT_DIR%\使用说明.txt

echo ✅ 打包完成

echo.
echo [4/4] 打包目录预览:
dir %OUTPUTDIR% /s

echo.
echo ============================================
echo  ✅ 打包完成！
echo  输出目录: %OUTPUT_DIR%
echo  解压即用，双击 mes-frontend.exe
echo ============================================
pause
