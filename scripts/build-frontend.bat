@echo off
setlocal

echo ==^> Building frontend...

cd /d "%~dp0\..\frontend"

call npm install --legacy-peer-deps
if errorlevel 1 (
    echo Frontend npm install failed!
    exit /b 1
)

call npm run build
if errorlevel 1 (
    echo Frontend build failed!
    exit /b 1
)

echo ==^> Frontend build complete: %cd%\dist\
