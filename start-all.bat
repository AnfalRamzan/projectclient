@echo off
title Due Manager System
echo Starting Due Manager System...
echo.

:: Start ngrok in background
start /B ngrok http 3000 --log=ngrok.log

:: Wait for ngrok
timeout /t 3

:: Get ngrok URL
for /f "tokens=*" %%i in ('curl -s http://localhost:4040/api/tunnels') do set NGROK_URL=%%i

:: Start server
node server.js

pause