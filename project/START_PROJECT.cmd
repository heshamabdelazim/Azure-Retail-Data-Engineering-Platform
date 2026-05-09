@echo off
setlocal

cd /d "%~dp0"

if exist "runtime\node.exe" (
  set "NODE_EXE=%~dp0runtime\node.exe"
) else (
  set "NODE_EXE="
  for /f "delims=" %%I in ('where node.exe 2^>nul') do (
    set "NODE_EXE=%%I"
    goto :node_found
  )
)

:node_found
if "%NODE_EXE%"=="" (
  echo Node runtime was not found.
  echo Keep runtime\node.exe with this project folder or install Node.js 24+.
  pause
  exit /b 1
)

echo Starting Smart Retail Pro...
echo Leave this window open while using the project.
echo.
"%NODE_EXE%" --no-warnings "app\server.mjs" --open --port 4173
