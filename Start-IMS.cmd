@echo off
setlocal EnableDelayedExpansion
set PORT=3200
if not "%~1"=="" set PORT=%~1
set ROOT=%~dp0
set NODE_EXE=
node -v >nul 2>&1
if errorlevel 1 (
  if exist "%ROOT%node\node.exe" (
    set "NODE_EXE=%ROOT%node\node.exe"
  ) else (
    set "NODE_URL=https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
    set "ZIP=%ROOT%node.zip"
    set "NODE_DIR=%ROOT%node"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try{Invoke-WebRequest -UseBasicParsing -Uri $env:NODE_URL -OutFile $env:ZIP}catch{}"
    if exist "%ZIP%" (
      powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path $env:ZIP -DestinationPath $env:NODE_DIR -Force"
      del "%ZIP%"
      for /R "%NODE_DIR%" %%F in (node.exe) do (
        set "NODE_EXE=%%F"
        goto run
      )
    )
  )
) else (
  set "NODE_EXE=node"
)
:run
if not defined NODE_EXE (
  echo Node is required but not available.
  exit /b 1
)
echo Starting IMS on port %PORT%...
"%NODE_EXE%" "%ROOT%server.js" %PORT%
endlocal
