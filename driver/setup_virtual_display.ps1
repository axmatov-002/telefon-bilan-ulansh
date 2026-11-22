# Windows Virtual Display Driver (IddCx) O'rnatish Yordamchisi
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  PhoneDisplay Pro - Windows Virtual Display Helper" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bu skript Windows 10/11 uchun haqiqiy 'Ikkinchi Ekran' (Virtual Monitor)"
Write-Host "yaratish imkoniyatini beruvchi rasmiy IddCx drayverini sozlashga yordam beradi."
Write-Host ""

$driverUrl = "https://github.com/itsmikethetech/Virtual-Display-Driver/releases/latest/download/Virtual-Display-Driver.zip"
$destDir = "$PSScriptRoot\VirtualDisplayDriver"

Write-Host "1. Rasmiy ochiq kodli Windows IddCx drayveri:" -ForegroundColor Green
Write-Host "   URL: https://github.com/itsmikethetech/Virtual-Display-Driver" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Avtomatik yuklab olish va papkani ochish..." -ForegroundColor Yellow

try {
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    $zipPath = "$destDir\driver.zip"
    Write-Host "   Drayver arxivini yuklab olinmoqda..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $driverUrl -OutFile $zipPath -UseBasicParsing
    
    Write-Host "   Arxiv ochilmoqda..." -ForegroundColor Gray
    Expand-Archive -Path $zipPath -DestinationPath $destDir -Force
    Remove-Item $zipPath -Force
    
    Write-Host ""
    Write-Host "✅ Drayver muvaffaqiyatli yuklandi!" -ForegroundColor Green
    Write-Host "   Fayllar joylashuvi: $destDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "O'rnatish bosqichlari:" -ForegroundColor Yellow
    Write-Host "1. $destDir papkasidagi 'VirtualDisplayDriver.inf' fayliga o'ng tugmani bosing va 'Install' (O'rnatish) ni tanlang."
    Write-Host "2. Windows bildirishnomasiga 'Ha / Ruxsat berish' (Allow) ni bosing."
    Write-Host "3. Klaviaturada [Win + P] tugmalarini bosing va 'Kengaytirish' (Extend) ni tanlang!"
    Write-Host "4. Tayyor! Endi Windows'da haqiqiy Ikkinchi Ekran (Display 2) hosil bo'ladi!"
    
    # Open folder in Windows Explorer
    Invoke-Item $destDir
} catch {
    Write-Host "Avtomatik yuklashda xatolik: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Iltimos, drayverni qo'lda yuklab oling:" -ForegroundColor Yellow
    Write-Host "👉 https://github.com/itsmikethetech/Virtual-Display-Driver/releases" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Bajarildi! Davom etish uchun ixtiyoriy tugmani bosing..." -ForegroundColor Gray
[Console]::ReadKey() | Out-Null
