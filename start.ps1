# PhoneDisplay Pro - PowerShell Launcher
$Host.UI.RawUI.WindowTitle = "PhoneDisplay Pro - Ikkinchi Ekran"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         PhoneDisplay Pro - Ikkinchi Ekran              " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server yuklanmoqda..." -ForegroundColor Green

# Open browser in background after 2 seconds
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000"
} | Out-Null

# Start server
node server.js
