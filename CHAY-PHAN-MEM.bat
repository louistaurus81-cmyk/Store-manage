@echo off
title PHAN MEM THINH PHAT - DATASOFT LAN SERVER
color 0A
chcp 65001 >nul
echo ========================================================
echo   DANG KHOI DONG HE THONG PHAN MEM THINH PHAT TECHNOLOGY
echo ========================================================
echo.

set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"

cd /d "C:\Users\louis\Desktop\Store-manage-main\Store-manage-main"

echo [1/2] Dang kiem tra ket noi Node.js & DATASOFT...
node -v
echo.
echo [2/2] Dang khoi dong may chu tai http://localhost:3000 ...
echo.
echo ========================================================
echo   TRUY CAP TRINH DUYET TAI: http://localhost:3000
echo ========================================================
echo.

start http://localhost:3000

npm run dev

pause
