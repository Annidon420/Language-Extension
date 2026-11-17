@echo off
title ScreenLingo AI - 1-Click Free Chrome Installer
color 0b

echo ========================================================
echo    ScreenLingo AI - Free Chrome Extension Installer
echo ========================================================
echo.

set "EXT_DIR=%~dp0extension"
echo [1/3] Copying extension folder path to your clipboard...
powershell -Command "Set-Clipboard -Value '%EXT_DIR%'"

echo [2/3] Extension folder path copied:
echo       %EXT_DIR%
echo.

echo [3/3] Opening Chrome Extensions page...
start chrome.exe chrome://extensions/

echo.
echo ========================================================
echo                 FINAL STEP (Takes 5 seconds):
echo ========================================================
echo 1. In Chrome, turn ON the "Developer mode" toggle (top-right).
echo 2. Click the "Load unpacked" button (top-left).
echo 3. In the folder prompt, press Ctrl+V and click "Select Folder"!
echo ========================================================
echo.
pause
