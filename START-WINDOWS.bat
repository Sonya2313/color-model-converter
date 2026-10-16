@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Install Node.js LTS first, then reopen this file.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check internet access and Node.js version.
    pause
    exit /b 1
  )
)
call npm run dev -- --open
pause
