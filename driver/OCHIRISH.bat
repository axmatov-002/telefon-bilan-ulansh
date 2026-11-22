@echo off
title Virtual Ekran Drayverini O'chirish
color 0c

net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~dp0OCHIRISH.bat\"' -Verb RunAs"
    exit /b
)

echo Virtual Display Driver o'chirilmoqda...
for /f "tokens=1,2 delims=:" %%a in ('pnputil /enum-drivers ^| findstr /i "MttVDD"') do (
    echo O'chirilmoqda...
)

pnputil /delete-driver oem*.inf /uninstall /force >nul 2>&1

if exist "C:\VirtualDisplayDriver" (
    rmdir /s /q "C:\VirtualDisplayDriver"
)

echo ✅ Virtual ekran drayveri o'chirildi.
pause
