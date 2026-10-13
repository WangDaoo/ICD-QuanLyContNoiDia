@echo off
setlocal
title ICD - Android Expo Go audit
cd /d "%~dp0"
echo ICD Field - Android native audit
echo Database: isolated Docker audit container. API: port 3001.
where node.exe >nul 2>nul
if errorlevel 1 goto missing_node
where pnpm.cmd >nul 2>nul
if errorlevel 1 goto missing_pnpm
set "ICD_NATIVE_ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if not exist "%ICD_NATIVE_ADB%" goto missing_adb
set "ICD_AUDIT_EVIDENCE_RUN=2026-10-11-native-01"
node audit/tools/native-docker-preflight.mjs --check-only
if errorlevel 1 goto failed
node --input-type=module -e "import {guardAuditRuntime,closeConnection} from './audit/tools/audit-api-client.mjs'; try{await guardAuditRuntime();console.log('[PASS] Isolated database/API target');}catch(e){console.error('[ERROR] API test is not ready. Ask to resume the Docker audit backend.');process.exitCode=1;}finally{await closeConnection();}"
if errorlevel 1 goto failed
"%ICD_NATIVE_ADB%" -s emulator-5554 get-state
if errorlevel 1 goto failed
node -e "const {spawnSync}=require('node:child_process');const a=process.env.ICD_NATIVE_ADB;const r=spawnSync(a,['-s','emulator-5554','reverse','--list'],{encoding:'utf8'});if(r.status!==0)process.exit(1);for(const p of [8081,3001]){const existing=r.stdout.split(/\r?\n/).find(x=>new RegExp('tcp:'+p+'\\s').test(x));if(existing&&!new RegExp('tcp:'+p+'\\s+tcp:'+p+'(?:\\s|$)').test(existing)){console.error('[ERROR] ADB port mapping belongs to a different target.');process.exit(1)}if(!existing){const n=spawnSync(a,['-s','emulator-5554','reverse','tcp:'+p,'tcp:'+p],{stdio:'inherit'});if(n.status!==0)process.exit(1)}}"
if errorlevel 1 goto failed
node -e "const s=require('node:net').createServer();s.once('error',()=>process.exit(2));s.listen(8081,'127.0.0.1',()=>s.close());"
if errorlevel 2 goto existing_metro
if errorlevel 1 goto failed
set "EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001/api"
echo Opening the project in Expo Go. Keep this window open.
echo If needed, enter exp://127.0.0.1:8081 in Expo Go.
call pnpm.cmd --filter @icd/mobile exec expo start --localhost --port 8081 --android
if errorlevel 1 goto failed
exit /b 0
:existing_metro
echo [INFO] Port 8081 is already in use. Existing processes were preserved.
echo If Metro belongs to this project, enter exp://127.0.0.1:8081 in Expo Go.
echo Otherwise close the old Metro terminal and run this file again.
pause
exit /b 2
:missing_node
echo [ERROR] Node.js was not found on PATH.
goto failed
:missing_pnpm
echo [ERROR] pnpm.cmd was not found on PATH.
goto failed
:missing_adb
echo [ERROR] Android SDK ADB was not found under LOCALAPPDATA.
:failed
echo [ERROR] Startup stopped. Copy the error message from this window.
pause
exit /b 1
