#!/bin/bash
# Script de diagnóstico para verificar problemas en Render

echo "====== DIAGNÓSTICO DE PROMPTSLABS ======"
echo "Fecha: $(date)"
echo "Entorno: ${NODE_ENV:-desarrollo}"
echo ""

echo "1. Información del sistema:"
echo "----------------------------"
echo "Usuario actual: $(whoami)"
echo "Directorio actual: $(pwd)"
echo "Espacio en disco:"
df -h .
echo ""

echo "2. Verificando directorios:"
echo "----------------------------"
mkdir -p ./data/images
echo "Estructura de directorios:"
find . -type d -maxdepth 2 | sort

echo ""
echo "3. Verificando archivos clave:"
echo "-----------------------------"
ARCHIVOS_CLAVE=(
  "server.js"
  "defaultData.js"
  "start.sh"
  "package.json"
  "images/placeholder.jpg"
  "data/prompts.db"
)

for archivo in "${ARCHIVOS_CLAVE[@]}"; do
  if [ -f "$archivo" ]; then
    echo "✓ $archivo - EXISTE ($(ls -lh "$archivo" | awk '{print $5}'))"
  else
    echo "✗ $archivo - NO EXISTE"
  fi
done

echo ""
echo "4. Verificando imágenes de ejemplo:"
echo "----------------------------------"
IMAGENES_EJEMPLO=(
  "1.jpg"
  "2.jpg"
  "3.jpg"
  "4.jpg"
  "5.jpg"
  "6.jpg"
  "7.jpg"
  "8.jpg"
  "9.jpg"
  "10.jpg"
)

echo "En ./images/:"
for img in "${IMAGENES_EJEMPLO[@]}"; do
  if [ -f "./images/$img" ]; then
    echo "✓ $img - EXISTE"
  else
    echo "✗ $img - NO EXISTE"
  fi
done

echo ""
echo "En ./data/images/:"
for img in "${IMAGENES_EJEMPLO[@]}"; do
  if [ -f "./data/images/$img" ]; then
    echo "✓ $img - EXISTE"
  else
    echo "✗ $img - NO EXISTE"
  fi
done

echo ""
echo "5. Copiando imágenes necesarias:"
echo "-------------------------------"
if [ -d "./images" ]; then
  echo "Copiando placeholder.jpg a ./data/images/"
  cp -v ./images/placeholder.jpg ./data/images/ 2>/dev/null || echo "Error al copiar placeholder.jpg"
  
  # Copiar imágenes numeradas de defaultData.js
  for img in "${IMAGENES_EJEMPLO[@]}"; do
    if [ -f "./images/$img" ]; then
      cp -v "./images/$img" "./data/images/" 2>/dev/null || echo "Error al copiar $img"
    fi
  done
else
  echo "No se encontró directorio ./images"
fi

echo ""
echo "6. Verificando permisos:"
echo "------------------------"
echo "Permisos de ./data:"
ls -la ./data/
echo ""
echo "Permisos de ./data/images:"
ls -la ./data/images/

echo ""
echo "7. Verificando base de datos:"
echo "----------------------------"
if [ -f "./data/prompts.db" ]; then
  echo "Base de datos encontrada: ./data/prompts.db"
  echo "Tamaño: $(ls -lh ./data/prompts.db | awk '{print $5}')"
  echo "Permisos: $(ls -la ./data/prompts.db | awk '{print $1,$3,$4}')"
else
  echo "NO SE ENCONTRÓ BASE DE DATOS en ./data/prompts.db"
  
  if [ -f "./prompts.db" ]; then
    echo "Base de datos encontrada en la raíz, copiando a ./data/"
    cp -v ./prompts.db ./data/
    echo "Copia completada"
  else
    echo "NO SE ENCONTRÓ BASE DE DATOS en la raíz"
    echo "La base de datos será creada por el servidor Node.js"
  fi
fi

echo ""
echo "8. Verificando Node.js:"
echo "----------------------"
echo "Versión de Node.js: $(node -v 2>/dev/null || echo 'No disponible')"
echo "Versión de npm: $(npm -v 2>/dev/null || echo 'No disponible')"
echo "Módulos instalados:"
ls -la ./node_modules/ 2>/dev/null | head -n 10 || echo "No se encontraron módulos o directorio node_modules"

echo ""
echo "====== FIN DEL DIAGNÓSTICO ======"
  else
    echo "No se encontró base de datos en ninguna ubicación"
  fi
fi

echo ""
echo "5. Verificando permisos:"
echo "-----------------------"
echo "Permisos en ./data:"
ls -ld ./data
echo "Permisos en ./data/images:"
ls -ld ./data/images
echo "Usuario actual: $(whoami)"

echo ""
echo "======= FIN DEL DIAGNÓSTICO ======="
