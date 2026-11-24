@echo off
title Push to GitHub - Gold Matrix
cls
echo ========================================================
echo  Gold Matrix - Push to GitHub Repository
echo  Target: https://github.com/swimmingboy-all/gold-investment-app.git
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Adding changes...
git add .

echo [2/3] Creating commit...
git commit -m "update: Gold Matrix web application files" 2>nul

echo [3/3] Pushing to GitHub (main branch)...
git push -u origin main

echo.
echo ========================================================
echo  Finished. Press any key to exit.
echo ========================================================
pause > nul
