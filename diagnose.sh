#!/bin/bash
# Script de diagnóstico para verificar problemas en Render

echo "====== DIAGNÓSTICO DE PROMPTSLABS ======"
echo "Fecha: $(date)"
echo ""

echo "1. Verificando directorios:"
echo "----------------------------"
echo "Directorio actual: $(pwd)"
mkdir -p ./data/images
echo "Creado directorio ./data/images"

echo ""
echo "2. Verificando archivos:"
echo "------------------------"
echo "Archivos en ./data:"
ls -la ./data/
echo ""
echo "Archivos en ./data/images:"
ls -la ./data/images/
echo ""
echo "Archivos en ./images:"
ls -la ./images/

echo ""
echo "3. Copiando imágenes necesarias:"
echo "-------------------------------"
if [ -d "./images" ]; then
  echo "Copiando imágenes de ./images a ./data/images/"
  cp -R ./images/* ./data/images/ 2>/dev/null || echo "Error al copiar imágenes"
  echo "Verificando contenido después de copiar:"
  ls -la ./data/images/
else
  echo "No se encontró directorio ./images"
fi

echo ""
echo "4. Verificando base de datos:"
echo "----------------------------"
if [ -f "./data/prompts.db" ]; then
  echo "Base de datos encontrada: ./data/prompts.db"
  echo "Tamaño: $(ls -lh ./data/prompts.db | awk '{print $5}')"
else
  echo "NO SE ENCONTRÓ BASE DE DATOS en ./data/prompts.db"
  
  if [ -f "./prompts.db" ]; then
    echo "Base de datos encontrada en la raíz, copiando a ./data/"
    cp ./prompts.db ./data/
    echo "Copia completada"
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
