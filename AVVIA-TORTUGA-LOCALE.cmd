@echo off
setlocal
title Tortuga App - Server locale
cd /d "%~dp0"

set "TORTUGA_NODE=C:\Users\Andreea\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not exist "%TORTUGA_NODE%" (
  echo Impossibile trovare il runtime Node.js locale.
  echo Percorso cercato: %TORTUGA_NODE%
  pause
  exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
  echo Le dipendenze della app non risultano installate.
  echo Apri questa cartella con Codex per ripristinarle.
  pause
  exit /b 1
)

echo Avvio Tortuga in locale...
echo Il browser si aprira automaticamente su http://localhost:3000
echo Lascia aperta questa finestra. Per arrestare il server premi Ctrl+C.
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3000'"
"%TORTUGA_NODE%" "node_modules\next\dist\bin\next" dev

echo.
echo Il server Tortuga si e arrestato.
pause
endlocal
