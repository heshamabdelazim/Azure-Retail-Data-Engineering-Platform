@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "azure\scripts\deploy.ps1"
pause
