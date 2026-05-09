@echo off
setlocal
cd /d "%~dp0"
if exist "runtime\node.exe" (set "NODE_EXE=%~dp0runtime\node.exe") else (set "NODE_EXE=node")
"%NODE_EXE%" "app\tests.mjs"
pause
