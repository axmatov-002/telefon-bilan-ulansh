@echo off
:: PhoneDisplay Pro - Virtual Display Driver O'rnatuvchi
title Virtual Ekran Drayverini O'rnatish
color 0b

:: Admin huquqini tekshirish
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Administrator huquqi bilan qayta ishga tushirilmoqda...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~dp0ORNATISH.bat\"' -Verb RunAs"
    exit /b
)

echo ==========================================================
echo   Virtual Display Driver (2-Ekran) O'rnatilmoqda...
echo ==========================================================
echo.

:: 1. Sozlamalarni C:\VirtualDisplayDriver ga tayyorlash
if not exist "C:\VirtualDisplayDriver" mkdir "C:\VirtualDisplayDriver"
if exist "%~dp0VirtualDisplayDriver\vdd_settings.xml" (
    copy /y "%~dp0VirtualDisplayDriver\vdd_settings.xml" "C:\VirtualDisplayDriver\vdd_settings.xml" >nul
)

:: 2. Winget orqali rasmiy avtomatik o'rnatishni sinash
echo 1-qadam: Rasmiy drayver paketi o'rnatilmoqda...
where winget >nul 2>&1
if %errorLevel% equ 0 (
    winget install --id=VirtualDrivers.Virtual-Display-Driver -e --accept-source-agreements --accept-package-agreements --silent
)

:: 3. Mahalliy inf fayl orqali ham tizimga yuklash (zaxira)
cd /d "%~dp0VirtualDisplayDriver"
if exist "MttVDD.inf" (
    echo 2-qadam: Tizim drayveri ro'yxatdan o'tkazilmoqda...
    pnputil /add-driver MttVDD.inf /install >nul 2>&1
    pnputil /scan-devices >nul 2>&1
)

:: 4. Windows ekranini avtomatik "Kengaytirish" (Extend) rejimiga o'tkazish
echo 3-qadam: Ekran kengaytirilmoqda (Extend mode)...
if exist "C:\Windows\System32\DisplaySwitch.exe" (
    C:\Windows\System32\DisplaySwitch.exe /extend
)

echo.
echo ==========================================================
echo    TAYYOR! Virtual Ikkinchi Ekran faollashtirildi!
echo ==========================================================
echo.
echo Endi kompyuteringizda ikkita monitor mavjud!
echo Brauzerda http://localhost:3000 ochib, "Share Screen" bosganingizda
echo "Ekran 2" ni tanlang va xohlagan dasturni telefonga o'tkazing!
echo.
echo Ekran sozlamalari ochilmoqda...
start ms-settings:display

echo.
pause
