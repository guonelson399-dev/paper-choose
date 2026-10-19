@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -m paperchoose serve --open
) else (
  python -m paperchoose serve --open
)
if errorlevel 1 (
  echo.
  echo Could not start. Install Python 3.10 or newer, or read INSTALL.txt.
  pause
)
