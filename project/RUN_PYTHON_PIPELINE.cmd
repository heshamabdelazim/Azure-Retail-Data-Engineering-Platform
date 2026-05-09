@echo off
setlocal
cd /d "%~dp0"

set "PY_CMD="
set "PY_ARGS="

where py.exe >nul 2>nul
if not errorlevel 1 (
  py.exe -3 --version >nul 2>nul
  if not errorlevel 1 (
    set "PY_CMD=py.exe"
    set "PY_ARGS=-3"
    goto :found_python
  )
)

where python.exe >nul 2>nul
if not errorlevel 1 (
  set "PY_CMD=python.exe"
  goto :found_python
)

where python3.exe >nul 2>nul
if not errorlevel 1 (
  set "PY_CMD=python3.exe"
  goto :found_python
)

:found_python
if "%PY_CMD%"=="" (
  echo Python was not found.
  echo Install Python 3.10+ or use the main SmartRetailProject.exe launcher.
  pause
  exit /b 1
)

"%PY_CMD%" %PY_ARGS% "app\python\smart_retail_pipeline.py" run %*
pause
