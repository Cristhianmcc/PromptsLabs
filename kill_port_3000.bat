@echo off
echo Buscando procesos que usan el puerto 3000...
netstat -ano | findstr :3000
echo.
echo Intentando matar los procesos que usan el puerto 3000...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
    echo Terminando el proceso con PID: %%P
    taskkill /F /PID %%P
    IF %ERRORLEVEL% EQU 0 (
        echo Proceso %%P terminado correctamente.
    ) ELSE (
        echo Error al terminar el proceso %%P. Puede requerir privilegios de administrador.
    )
)
echo.
echo Verificando si el puerto 3000 sigue en uso...
netstat -ano | findstr :3000
echo.
echo Si aún ves procesos usando el puerto 3000, intenta:
echo 1. Ejecutar este script como administrador
echo 2. Reiniciar tu computadora
echo.
pause
