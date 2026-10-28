@echo off
title MedAtlas MCQ Server
echo ========================================================
echo       MedAtlas MCQ - Laptop Server Launcher
echo ========================================================
echo.
echo 1. Ensuring production build is up to date...
cd /d "%~dp0"
call npm.cmd run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed. Please check the errors above.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Launching Node.js Express server on http://localhost:3000 ...
start "MedAtlas Backend Server" cmd /k "title MedAtlas Backend && npx.cmd tsx server.ts"

timeout /t 3 /nobreak >nul

echo.
echo 3. Launching Cloudflare Public HTTPS Tunnel...
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
    start "MedAtlas Cloudflare Tunnel" cmd /k "title MedAtlas Cloudflare Tunnel && \"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://127.0.0.1:3000"
) else (
    start "MedAtlas Public Tunnel" cmd /k "title MedAtlas Public Tunnel && npx.cmd --yes localtunnel --port 3000"
)

echo.
echo ========================================================
echo   Server is now running!
echo   - Local access: http://localhost:3000
echo   - External access: Look at the Cloudflare Tunnel window
echo     for your https://...trycloudflare.com URL!
echo ========================================================
echo.
pause
