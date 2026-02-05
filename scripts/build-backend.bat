@echo off
setlocal

echo ==^> Building backend with PyInstaller...

cd /d "%~dp0\..\backend"

pip install pyinstaller 2>nul

pyinstaller lumen-backend.spec --clean --noconfirm
if errorlevel 1 (
    echo Backend build failed!
    exit /b 1
)

echo ==^> Backend build complete: %cd%\dist\lumen-backend\
