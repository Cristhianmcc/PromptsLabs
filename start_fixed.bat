@echo off
echo ===== INICIANDO APLICACION GALERIA DE PROMPTS =====

echo Deteniendo posibles instancias previas del servidor...
taskkill /IM "node.exe" /F 2>nul

echo.
echo Verificando directorios...
if not exist data mkdir data
if not exist data\images mkdir data\images
if not exist images mkdir images
echo Directorios OK.

echo.
echo Verificando bases de datos...
if exist data\prompts.db (
    echo Base de datos encontrada en data\prompts.db
    copy /Y data\prompts.db prompts.db
    echo Copia de seguridad creada en la raiz.
) else if exist prompts.db (
    echo Base de datos encontrada en la raiz, copiando a data\prompts.db
    copy /Y prompts.db data\prompts.db
) else (
    echo No se encontro ninguna base de datos, ejecutando db_init.js...
    node db_init.js
)

echo.
echo Verificando usuario administrador...
node -e "require('./auth_fix.js')" || echo Error al verificar usuario admin.

echo.
echo Sincronizando imagenes entre directorios...
for %%F in (images\*.*) do (
    if not exist data\images\%%~nxF (
        copy "%%F" "data\images\%%~nxF"
        echo Copiada %%~nxF a data\images/
    )
)

for %%F in (data\images\*.*) do (
    if not exist images\%%~nxF (
        copy "%%F" "images\%%~nxF"
        echo Copiada %%~nxF a images/
    )
)

echo.
echo ===== INICIANDO SERVIDOR =====
node server.js
