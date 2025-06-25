#!/bin/bash
# Script de inicio para Render.com

# Ejecutar diagnóstico
echo "Ejecutando diagnóstico..."
bash ./diagnose.sh > ./data/diagnostico.log 2>&1

# Crear directorios necesarios si no existen
mkdir -p ./data
mkdir -p ./data/images

# Verificar permisos y ajustarlos si es necesario
chmod -R 755 ./data
chmod -R 755 ./data/images

# Copiar imágenes locales al directorio de datos si existen
if [ -d "./images" ]; then
  echo "Copiando imágenes al directorio de datos..."
  cp -R ./images/* ./data/images/ 2>/dev/null || true
fi

# Verificar si la base de datos existe y copiarla si es necesario
if [ ! -f "./data/prompts.db" ] && [ -f "./prompts.db" ]; then
  echo "Copiando base de datos a directorio de datos..."
  cp ./prompts.db ./data/prompts.db || true
fi

# Ejecutar el servidor con logs detallados
NODE_DEBUG=module,http,net npm start 2>&1 | tee ./data/server.log
