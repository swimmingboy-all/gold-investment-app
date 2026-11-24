Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Gold Matrix - GitHub 원격 저장소 코드 푸시 (업로드)" -ForegroundColor Yellow
Write-Host " 대상: https://github.com/swimmingboy-all/gold-investment-app.git" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $workspace

Write-Host "[1/3] 변경 사항 스테이징 중..." -ForegroundColor Green
git add .

Write-Host "[2/3] 커밋 생성 중..." -ForegroundColor Green
git commit -m "update: Gold Matrix web application files" 2>$null

Write-Host "[3/3] GitHub로 푸시 중..." -ForegroundColor Green
git push -u origin main

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " 처리가 완료되었습니다. 엔터를 누르면 종료됩니다." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Read-Host
