@echo off
echo Deprem Takip Uygulamasi Baslatiliyor...
echo.

:: Backend sunucusunu başlat
start "Deprem Server" cmd /k "cd /d %~dp0server && npm start"

:: 2 saniye bekle
timeout /t 2 /nobreak > nul

:: Frontend'i başlat
start "Deprem Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Sunucular baslatildi!
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
pause
