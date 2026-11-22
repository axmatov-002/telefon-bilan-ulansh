@echo off
title GitHub ga Yuklash - PhoneDisplay Pro
color 0b

echo ========================================================
echo   PhoneDisplay Pro - GitHub Repozitoriyasiga Yuklash
echo ========================================================
echo.
echo Repozitoriya: https://github.com/axmatov-002/telefon-bilan-ulansh.git
echo.

git remote set-url origin https://github.com/axmatov-002/telefon-bilan-ulansh.git
git config http.postBuffer 524288000
git config http.version HTTP/1.1
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999

echo [1/2] O'zgarishlar tekshirilmoqda...
git add .
git commit -m "PhoneDisplay Pro: Ikkinchi ekran va telefon masofaviy boshqaruvi" >nul 2>&1

echo [2/2] GitHub ga yuklanmoqda (git push)...
echo Agar brauzerda GitHub oynasi ochilsa, "Sign in with your browser" ni bosing.
echo.
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   Muvaffaqiyatli yuklandi!
    echo   https://github.com/axmatov-002/telefon-bilan-ulansh
    echo ========================================================
) else (
    echo.
    echo [!] Yuklashda xatolik yuz berdi. Iltimos, yuqoridagi xabarni o'qing.
)
echo.
pause
