@echo off
rem Rebuild the site from profile\, projects\ and gallery\ - run after every change.
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul || (
  echo.
  echo   Python is not installed. Get it from https://www.python.org/downloads/
  echo   and tick "Add python.exe to PATH" during setup.
  echo.
  pause
  exit /b 1
)
python -c "import PIL, pymupdf" >nul 2>nul || (
  echo   First run: installing the image tools ^(pillow, pymupdf^)...
  python -m pip install --quiet --disable-pip-version-check pillow pymupdf
)
python tools\build.py
pause
