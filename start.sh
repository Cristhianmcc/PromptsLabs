#!/bin/bash
# Script de inicio para Render.com

# Crear directorios necesarios si no existen
mkdir -p ./data
mkdir -p ./data/images

# Copiar imágenes locales al directorio de datos si existen
if [ -d "./images" ]; then
  echo "Copiando imágenes al directorio de datos..."
  cp -R ./images/* ./data/images/ 2>/dev/null || true
fi

# Ejecutar el servidor
npm start
