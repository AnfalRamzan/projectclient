@echo off
:loop
echo Starting Server...
node server.js
echo Server crashed! Restarting in 5 seconds...
timeout /t 5
goto loop