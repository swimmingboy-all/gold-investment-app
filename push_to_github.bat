@echo off
chcp 65001 > nul
echo ========================================================
echo  Gold Matrix - GitHub 원격 저장소로 코드 푸시 (업로드)
echo  저장소: https://github.com/swimmingboy-all/gold-investment-app.git
echo ========================================================
echo.
cd /d "%~dp0"
echo [1/3] 변경 사항을 스테이징합니다...
git add .
echo [2/3] 커밋을 생성합니다...
git commit -m "update: Gold Matrix web application files" 2>nul
echo [3/3] GitHub로 푸시합니다...
git push -u origin main
echo.
echo ========================================================
echo 처리가 완료되었습니다. 아무 키나 누르면 창이 닫힙니다.
echo ========================================================
pause
