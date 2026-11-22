@echo off
title PhoneDisplay Pro - Ikkinchi Ekran
color 0b
echo ========================================================
echo         PhoneDisplay Pro - Ikkinchi Ekran
echo ========================================================
echo.

:: 1. Eski band qilingan port 3000 jarayonini tozalash (EADDRINUSE xatosini oldini olish)
echo [1/5] Port 3000 tekshirilmoqda...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Eski jarayon to'xtatilmoqda: PID %%a
    taskkill /f /pid %%a >nul 2>&1
)

:: 2. Tarmoq ruxsatini qo'shish (agar admin bo'lsa)
echo [2/5] Tarmoq ruxsatlari sozlanmoqda...
netsh advfirewall firewall add rule name="PhoneDisplayPro_3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
netsh advfirewall firewall add rule name="PhoneDisplayPro_3443" dir=in action=allow protocol=TCP localport=3443 >nul 2>&1

:: 3. Agar telefon USB orqali ulangan bo'lsa, avtomatik localhost portini yo'naltirish
if exist "bin\platform-tools\adb.exe" (
    echo [3/5] USB orqali ulangan telefonlar uchun localhost:3000 yo'naltirilmoqda...
    bin\platform-tools\adb.exe reverse tcp:3000 tcp:3000 >nul 2>&1
)

:: 4. Brauzerni avtomatik ochish
echo [4/5] Kompyuter boshqaruv paneli ochilmoqda: http://localhost:3000
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"

:: 5. Serverni ishga tushirish
echo [5/5] Server ishga tushirilmoqda...
echo ========================================================
echo.
node server.js
if %errorlevel% neq 0 (
    echo.
    echo L Xatolik yuz berdi! Iltimos, yuqoridagi xabarni o'qing.
)
pause
