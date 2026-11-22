@echo off
title PhoneDisplay Pro - To'g'ridan-To'g'ri USB Sim Orqali Ulanish (Localhost)
color 0b

echo ========================================================
echo   PhoneDisplay Pro - USB Sim Orqali Localhost Ulanish
echo ========================================================
echo.
echo Bu usul Wi-Fi yoki routersiz, telefonni oddiy quvvatlagich
echo USB kabeli orqali kompyuterga to'g'ridan-to'g'ri ulash uchun!
echo.
echo 1. Telefoningizni USB kabel bilan kompyuterga ulang.
echo 2. Telefonda "USB Debugging" (Nosozliklarni tuzatish) ni yoqing:
echo    (Sozlamalar -> Telefon haqida -> Qurilish raqami (Build Number) ustiga 7 marta bosing
echo     -> Dasturchi parametrlari -> USB Debugging ni yoqing).
echo.
echo Ulanish tekshirilmoqda...
echo.

set "ADB_PATH=%~dp0..\bin\platform-tools\adb.exe"
if not exist "%ADB_PATH%" (
    where adb >nul 2>&1
    if %errorlevel% equ 0 set "ADB_PATH=adb"
)

if not exist "%ADB_PATH%" (
    echo [Eslatma] ADB vositasi topilmadi.
    echo Wi-Fi orqali ulanish eng oson yo'ldir:
    echo Brauzeringizda quyidagi manzilni oching:
    echo =I http://192.168.50.217:3000
    echo.
) else (
    echo Ulangan qurilmalar tekshirilmoqda:
    "%ADB_PATH%" devices
    echo.
    echo [Port Forwarding] Port 3000 telefonga yo'naltirilmoqda...
    "%ADB_PATH%" reverse tcp:3000 tcp:3000
    if %errorlevel% equ 0 (
        echo.
        echo ========================================================
        echo  TAYYOR! Port 3000 muvaffaqiyatli yo'naltirildi!
        echo ========================================================
        echo.
        echo Endi telefoningiz brauzerida to'g'ridan-to'g'ri quyidagini oching:
        echo =I http://localhost:3000
        echo.
        echo Telefon brauzerida avtomatik ochilmoqda...
        "%ADB_PATH%" shell am start -a android.intent.action.VIEW -d "http://localhost:3000" >nul 2>&1
    ) else (
        echo.
        echo   Telefonda "Ushbu kompyuterga ruxsat berish" (Allow USB Debugging)
        echo oynasi chiqqan bo'lsa, "Har doim ruxsat berish" -> "OK" ni bosing
        echo va ushbu faylni qayta ishga tushiring!
    )
)

echo.
pause
