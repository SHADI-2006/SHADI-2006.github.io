@echo off
rem Build the site, then open it in your browser at http://localhost:8080 (close this window to stop).
chcp 65001 >nul
cd /d "%~dp0"
python tools\build.py || (pause & exit /b 1)
start "" http://localhost:8080
echo   The site is running at http://localhost:8080  -  close this window to stop it.
python -m http.server 8080 --bind 127.0.0.1 >nul 2>nul
