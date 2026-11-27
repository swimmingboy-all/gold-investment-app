@echo off
title Gold Matrix Local Server
cls
echo ========================================================
echo  Starting Gold Matrix Web Server (http://localhost:8088)...
echo  Press Ctrl+C in this window to stop the server.
echo ========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
