@echo off
echo ===== Iniciando proceso de despliegue =====

echo Creando directorios necesarios...
if not exist data mkdir data
if not exist data\images mkdir data\images
if not exist images mkdir images

echo Verificando bases de datos...
if exist data\prompts.db (
    echo Base de datos encontrada en data\prompts.db
    copy /Y data\prompts.db prompts.db
) else if exist prompts.db (
    echo Base de datos encontrada en la raiz, copiando a data\prompts.db
    copy /Y prompts.db data\prompts.db
) else (
    echo No se encontro ninguna base de datos, se debe inicializar una
    echo Ejecutando db_init.js...
    node db_init.js
)

echo Sincronizando directorios de imagenes...
if exist images\placeholder.jpg copy /Y images\placeholder.jpg data\images\
if exist data\images\placeholder.jpg copy /Y data\images\placeholder.jpg images\

echo Ejecutando sincronizacion de archivos...
node fix_database.js

echo ===== Iniciando servidor =====
node server.js
