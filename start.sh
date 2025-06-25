#!/bin/bash
# Script de inicio para Render.com

echo "===== Iniciando proceso de despliegue en $(date) ====="

# Crear directorios necesarios si no existen
echo "Creando directorios necesarios..."
mkdir -p ./data
mkdir -p ./data/images

# Verificar permisos y ajustarlos si es necesario
echo "Configurando permisos..."
chmod -R 755 ./data
chmod -R 755 ./data/images

# Copiar imágenes locales al directorio de datos si existen
echo "Copiando imágenes de ejemplo..."
if [ -d "./images" ]; then
  echo "  - Directorio de imágenes encontrado"
  cp -v ./images/placeholder.jpg ./data/images/ 2>/dev/null || echo "  - Error al copiar placeholder.jpg"
  
  # Copiar imágenes numeradas (1.jpg, 2.jpg, etc.) que se usan en defaultData.js
  for i in {1..16}; do
    if [ -f "./images/$i.jpg" ]; then
      cp -v "./images/$i.jpg" "./data/images/" 2>/dev/null || echo "  - Error al copiar $i.jpg"
    fi
  done
  
  echo "  - Copia de imágenes completada"
else
  echo "  - Directorio de imágenes no encontrado!"
fi

# Verificar si la base de datos existe y copiarla si es necesario
echo "Verificando base de datos..."
if [ ! -f "./data/prompts.db" ] && [ -f "./prompts.db" ]; then
  echo "  - Copiando base de datos existente al directorio de datos..."
  cp ./prompts.db ./data/prompts.db || echo "  - Error al copiar base de datos"
else
  echo "  - La base de datos será creada por el servidor Node.js si no existe"
fi

# Ejecutar diagnóstico
echo "Ejecutando diagnóstico pre-inicio..."
bash ./diagnose.sh > ./data/diagnostico_pre.log 2>&1

# Listar archivos en ./data/images para verificar
echo "Contenido del directorio de imágenes:"
ls -la ./data/images/

echo "===== Iniciando servidor Node.js ====="
# Ejecutar el servidor con logs detallados
NODE_DEBUG=module,http,net npm start 2>&1 | tee ./data/server.log
