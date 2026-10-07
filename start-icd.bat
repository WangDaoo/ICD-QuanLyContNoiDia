@echo off
setlocal
title ICD - Start project
cd /d "%~dp0"
where powershell.exe >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Windows PowerShell is required.
    pause
    exit /b 1
)
powershell.exe -NoLogo -NoProfile -File "%~dp0scripts\start-project.ps1" %*
set "ICD_EXIT_CODE=%ERRORLEVEL%"
if not "%ICD_EXIT_CODE%"=="0" (
    echo.
    echo [ERROR] ICD startup failed. Read the message above and logs\launcher.
    if "%~1"=="" pause
)
exit /b %ICD_EXIT_CODE%
