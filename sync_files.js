const fs = require('fs');
const path = require('path');
const imageHelper = require('./image_helper');

/**
 * Script para sincronizar archivos entre diferentes directorios del proyecto
 * Principalmente para asegurar que las imágenes estén disponibles tanto en /images como en /data/images
 */

// Funciones auxiliares
function copyFile(source, dest) {
    try {
        fs.copyFileSync(source, dest);
        console.log(`✅ Archivo copiado exitosamente: ${source} -> ${dest}`);
        return true;
    } catch (err) {
        console.error(`❌ Error al copiar archivo: ${err.message}`);
        return false;
    }
}

function checkDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`Creando directorio: ${dir}`);
        try {
            fs.mkdirSync(dir, { recursive: true });
            return true;
        } catch (err) {
            console.error(`❌ Error al crear directorio: ${err.message}`);
            return false;
        }
    }
    return true;
}

// Rutas de archivos
const dataDbPath = path.join(__dirname, 'data', 'prompts.db');
const rootDbPath = path.join(__dirname, 'prompts.db');
const dataImagesPath = path.join(__dirname, 'data', 'images');
const rootImagesPath = path.join(__dirname, 'images');

// Copia la base de datos desde data/ a la raíz
function copyDatabase() {
    console.log("Copiando base de datos...");
    
    // Verificar si existe la base de datos en data/
    if (!fs.existsSync(dataDbPath)) {
        console.error(`❌ La base de datos fuente no existe: ${dataDbPath}`);
        return false;
    }
    
    // Hacer backup si existe en la raíz
    if (fs.existsSync(rootDbPath)) {
        const backupPath = `${rootDbPath}.bak`;
        try {
            fs.copyFileSync(rootDbPath, backupPath);
            console.log(`✅ Backup creado: ${backupPath}`);
        } catch (err) {
            console.error(`⚠️ No se pudo crear backup: ${err.message}`);
        }
    }
    
    // Copiar la base de datos
    return copyFile(dataDbPath, rootDbPath);
}

// Copia imágenes entre data/images y images/
function syncImages() {
    console.log("\nSincronizando imágenes entre directorios...");
    
    // Asegurar que ambos directorios existan
    if (!checkDirectoryExists(dataImagesPath) || !checkDirectoryExists(rootImagesPath)) {
        return false;
    }
    
    try {
        // 1. Primero sincronizar de data/images a images/
        console.log('\n1. Copiando imágenes de data/images a images/:');
        const result1 = imageHelper.syncImages(dataImagesPath, rootImagesPath, {
            onlyCopyMissing: true,
            priorityImages: ['placeholder.jpg']
        });
        
        console.log(`✅ ${result1.copied} imágenes copiadas`);
        console.log(`- ${result1.skipped} imágenes omitidas (ya existentes)`);
        console.log(`❌ ${result1.errors} errores`);
        
        // 2. Luego sincronizar de images/ a data/images
        console.log('\n2. Copiando imágenes de images/ a data/images/:');
        const result2 = imageHelper.syncImages(rootImagesPath, dataImagesPath, {
            onlyCopyMissing: true
        });
        
        console.log(`✅ ${result2.copied} imágenes copiadas`);
        console.log(`- ${result2.skipped} imágenes omitidas (ya existentes)`);
        console.log(`❌ ${result2.errors} errores`);
        
        // Mostrar total
        const totalSynced = result1.copied + result2.copied;
        console.log(`\nTotal de imágenes sincronizadas: ${totalSynced}`);
        
        return totalSynced > 0 || (result1.skipped > 0 && result2.skipped > 0);
    } catch (error) {
        console.error(`❌ Error durante la sincronización: ${error.message}`);
        return false;
    }
}

// Ejecutar operaciones
console.log("=== INICIANDO SINCRONIZACIÓN DE ARCHIVOS ===");
console.log("Fecha:", new Date().toLocaleString());
console.log("---------------------------------------------------");

const dbCopied = copyDatabase();
const imagesSynced = syncImages();

console.log("\n=== RESUMEN ===");
console.log(`Base de datos: ${dbCopied ? '✅ Copiada' : '❌ Error'}`);
console.log(`Imágenes: ${imagesSynced ? '✅ Sincronizadas' : '❌ Error'}`);
console.log("---------------------------------------------------");
console.log("Ahora puedes reiniciar el servidor para que use los archivos actualizados.");
