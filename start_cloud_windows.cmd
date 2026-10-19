@echo off
setlocal
cd /d "%~dp0"
echo Paste the Paper Choose web page address (starts with https://), then press Enter:
set /p PC_ORIGIN=
if exist ".paperchoose-venv\Scripts\python.exe" (
  .paperchoose-venv\Scripts\python.exe -m paperchoose serve --allow-origin "%PC_ORIGIN%"
  goto finished
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -m paperchoose serve --allow-origin "%PC_ORIGIN%"
) else (
  python -m paperchoose serve --allow-origin "%PC_ORIGIN%"
)
:finished
if errorlevel 1 (
  echo.
  echo Could not start. Install Python 3.10 or newer, or read INSTALL.txt.
  pause
)
