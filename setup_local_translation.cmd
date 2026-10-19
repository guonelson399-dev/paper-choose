@echo off
setlocal
cd /d "%~dp0"
echo This installs optional local translation in .paperchoose-venv.
echo It downloads Python packages and Chinese/English models from their providers.
echo No manuscript is read or uploaded. Several hundred MB may be required.
choice /C YN /M "Continue"
if errorlevel 2 exit /b 0
if exist ".paperchoose-venv\Scripts\python.exe" goto install
where py >nul 2>nul
if errorlevel 1 goto usepython
py -3.12 -m venv .paperchoose-venv
if errorlevel 1 goto failed
goto install
:usepython
python -m venv .paperchoose-venv
if errorlevel 1 goto failed
:install
.paperchoose-venv\Scripts\python.exe -c "import sys; assert (3,10) <= sys.version_info[:2] <= (3,12), 'Use Python 3.10 to 3.12'"
if errorlevel 1 goto failed
.paperchoose-venv\Scripts\python.exe -m pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
if errorlevel 1 goto failed
.paperchoose-venv\Scripts\python.exe -m pip install -r requirements-translation.txt
if errorlevel 1 goto failed
.paperchoose-venv\Scripts\python.exe -m paperchoose.translation --download-models
if errorlevel 1 goto failed
echo Done. Close the old server, then double-click start_windows.cmd.
pause
exit /b 0
:failed
echo Setup did not complete. Please keep this window and report the error.
pause
exit /b 1
