@echo off
start cmd /k "python server.py"
timeout /t 3
start cmd /k "npx expo start --web"
echo Сервер и клиент запущены!