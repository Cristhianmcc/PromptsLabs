@echo off
echo Iniciando servidor con puerto alternativo si es necesario...

:: Primero intenta iniciar con el script original
echo Intentando iniciar con start.bat...
start /wait cmd /c start.bat

:: Si falla, intenta con puerto alternativo
if %ERRORLEVEL% NEQ 0 (
    echo El puerto 3000 parece estar en uso, intentando con puerto alternativo 3001...
    set PORT=3001
    node server.js
)
