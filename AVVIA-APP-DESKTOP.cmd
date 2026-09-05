@echo off
title Tortuga App Live (Porta 3000)
set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;%PATH%"
cd /d "C:\Users\Andreea\Desktop\tortuga-app-live"
node node_modules\next\dist\bin\next dev -p 3000 --webpack
pause
