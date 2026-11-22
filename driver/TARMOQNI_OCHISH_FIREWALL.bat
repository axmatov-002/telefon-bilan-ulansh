@echo off
title PhoneDisplay Pro - Windows Brandmauer (Firewall) Ruxsati
color 0a

echo ========================================================
echo   PhoneDisplay Pro - Port 3000 uchun Firewall Ruxsati
echo ========================================================
echo.

:: Administrator huquqini tekshirish
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Administrator huquqi talab qilinadi.
    echo Uskunani administrator nomidan qayta ishga tushirmoqda...
    powershell -Command "Start-Process '%~0' -Verb RunAs"
    exit /b
)

echo [1/2] Windows Brandmauerida port 3000 va 3443 ga kirish ruxsati berilmoqda...
netsh advfirewall firewall delete rule name="PhoneDisplayPro_3000" >nul 2>&1
netsh advfirewall firewall add rule name="PhoneDisplayPro_3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
netsh advfirewall firewall delete rule name="PhoneDisplayPro_3443" >nul 2>&1
netsh advfirewall firewall add rule name="PhoneDisplayPro_3443" dir=in action=allow protocol=TCP localport=3443 >nul 2>&1

echo [2/2] Node.js dasturi uchun umumiy ruxsat berilmoqda...
netsh advfirewall firewall add rule name="PhoneDisplayPro_Node" dir=in action=allow program="%ProgramFiles%\nodejs\node.exe" enable=yes >nul 2>&1

echo.
echo ========================================================
echo  TAYYOR! Endi telefoningiz kompyuterga bemalol ulanadi!
echo ========================================================
echo.
pause
