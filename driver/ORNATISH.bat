@echo off
:: PhoneDisplay Pro - Virtual Display Driver O'rnatuvchi
title Virtual Ekran Drayverini O'rnatish
color 0b

:: Admin huquqini tekshirish
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo [!] Administrator huquqi talab qilinadi.
    echo Iltimos, chiqqan UAC darchasida "Ha" (Yes) ni bosing...
    echo.
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c `\"%~dp0ORNATISH.bat`\"' -Verb RunAs"
    exit /b
)

echo ==========================================================
echo   Virtual Display Driver (2-Mustaqil Ekran) O'rnatilmoqda
echo ==========================================================
echo.

:: 1. Sozlamalarni C:\VirtualDisplayDriver ga tayyorlash
if not exist "C:\VirtualDisplayDriver" mkdir "C:\VirtualDisplayDriver"
if exist "%~dp0VirtualDisplayDriver\vdd_settings.xml" (
    copy /y "%~dp0VirtualDisplayDriver\vdd_settings.xml" "C:\VirtualDisplayDriver\vdd_settings.xml" >nul
    echo [+] Sozlamalar fayli (vdd_settings.xml) tayyorlandi.
)

:: 2. Winget orqali rasmiy avtomatik o'rnatish
echo.
echo [1/3] Rasmiy Virtual Display Driver o'rnatilmoqda...
where winget >nul 2>&1
if %errorLevel% equ 0 (
    winget install --id=VirtualDrivers.Virtual-Display-Driver -e --accept-source-agreements --accept-package-agreements
)

:: 3. Mahalliy inf fayl orqali ro'yxatdan o'tkazish
echo.
echo [2/3] Mahalliy drayver kutubxonasi tekshirilmoqda...
cd /d "%~dp0VirtualDisplayDriver"
if exist "MttVDD.inf" (
    pnputil /add-driver MttVDD.inf /install >nul 2>&1
    pnputil /scan-devices >nul 2>&1
)

:: 4. Windows ekranini avtomatik "Kengaytirish" (Extend) rejimiga o'tkazish
echo.
echo [3/3] Windows ekrani "Kengaytirish" (Extend) rejimiga o'tkazilmoqda...
if exist "C:\Windows\System32\DisplaySwitch.exe" (
    C:\Windows\System32\DisplaySwitch.exe /extend
)

echo.
echo ==========================================================
echo     TAYYOR! Virtual Ikkinchi Ekran faollashtirildi!
echo ==========================================================
echo.
echo Endi kompyuteringizda ikkita mustaqil monitor mavjud!
echo Xohlagan dasturingizni sichqoncha bilan o'ng tomonga (telefon ekraniga) surishingiz mumkin.
echo.
echo Ekran sozlamalari ochilmoqda (Display Settings)...
start ms-settings:display

echo.
pause
