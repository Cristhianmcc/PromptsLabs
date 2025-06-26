#!/bin/bash

echo "===== INICIANDO APLICACIÓN GALERÍA DE PROMPTS ====="

# Verificar directorios
echo "Verificando directorios..."
mkdir -p data/images
mkdir -p images
echo "Directorios OK"

# Verificar bases de datos
echo "Verificando bases de datos..."
if [ -f "data/prompts.db" ]; then
    echo "Base de datos encontrada en data/prompts.db"
    cp -f data/prompts.db prompts.db
    echo "Copia de seguridad creada en la raíz"
elif [ -f "prompts.db" ]; then
    echo "Base de datos encontrada en la raíz, copiando a data/prompts.db"
    cp -f prompts.db data/prompts.db
else
    echo "No se encontró ninguna base de datos, ejecutando db_init.js..."
    node db_init.js
fi

# Sincronizar imágenes entre directorios
echo "Sincronizando imágenes entre directorios..."
if [ -d "images" ] && [ -d "data/images" ]; then
    echo "Copiando imágenes de images/ a data/images/..."
    for file in images/*; do
        basename=$(basename "$file")
        if [ -f "$file" ] && [ ! -f "data/images/$basename" ]; then
            cp -f "$file" "data/images/$basename"
            echo "Copiado $basename a data/images/"
        fi
    done
    
    echo "Copiando imágenes de data/images/ a images/..."
    for file in data/images/*; do
        basename=$(basename "$file")
        if [ -f "$file" ] && [ ! -f "images/$basename" ]; then
            cp -f "$file" "images/$basename"
            echo "Copiado $basename a images/"
        fi
    done
fi

# Iniciar servidor
echo "===== INICIANDO SERVIDOR ====="
node server.js
