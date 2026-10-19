@echo off
setlocal
cd /d "%~dp0"
if exist ".paperchoose-venv\Scripts\python.exe" (
  .paperchoose-venv\Scripts\python.exe -m paperchoose serve --open
  goto finished
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -m paperchoose serve --open
) else (
  python -m paperchoose serve --open
)
:finished
if errorlevel 1 (
  echo.
  echo Could not start. Install Python 3.10 or newer, or read INSTALL.txt.
  pause
)
