@echo off
title Lumen AI

echo Starting Lumen AI...
echo.

:: Start backend
start "Lumen AI - Backend" cmd /c "cd /d %~dp0backend && uvicorn app.main:app --port 8000"

:: Start frontend
start "Lumen AI - Frontend" cmd /c "cd /d %~dp0frontend && npx vite --port 5173"

:: Wait for servers to start
timeout /t 4 /nobreak >nul

:: Open browser
start http://localhost:5173

echo.
echo Lumen AI is running!
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.
echo Close this window and the two server windows to stop.
pause
