const fs = require('fs');
const path = require('path');

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

// Copia imágenes desde data/images a images/
function copyImages() {
    console.log("\nCopiando imágenes...");
    
    // Verificar si existe directorio fuente
    if (!fs.existsSync(dataImagesPath)) {
        console.error(`❌ El directorio fuente no existe: ${dataImagesPath}`);
        return false;
    }
    
    // Crear directorio destino si no existe
    if (!checkDirectoryExists(rootImagesPath)) {
        return false;
    }
    
    // Obtener archivos del directorio fuente
    let files;
    try {
        files = fs.readdirSync(dataImagesPath);
    } catch (err) {
        console.error(`❌ Error al leer directorio: ${err.message}`);
        return false;
    }
    
    console.log(`Encontrados ${files.length} archivos para copiar`);
    
    // Copiar cada archivo
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
        const sourcePath = path.join(dataImagesPath, file);
        const destPath = path.join(rootImagesPath, file);
        
        // Verificar que es un archivo (no directorio)
        let isFile;
        try {
            isFile = fs.statSync(sourcePath).isFile();
        } catch (err) {
            console.error(`❌ Error al verificar archivo ${file}: ${err.message}`);
            errorCount++;
            continue;
        }
        
        if (!isFile) {
            continue;
        }
        
        // Copiar el archivo
        if (copyFile(sourcePath, destPath)) {
            successCount++;
        } else {
            errorCount++;
        }
    }
    
    console.log(`\n✅ Copiados ${successCount} archivos exitosamente`);
    if (errorCount > 0) {
        console.log(`⚠️ ${errorCount} archivos no pudieron ser copiados`);
    }
    
    return successCount > 0;
}

// Ejecutar operaciones
console.log("=== INICIANDO SINCRONIZACIÓN DE ARCHIVOS ===");
console.log("Fecha:", new Date().toLocaleString());
console.log("---------------------------------------------------");

const dbCopied = copyDatabase();
const imagesCopied = copyImages();

console.log("\n=== RESUMEN ===");
console.log(`Base de datos: ${dbCopied ? '✅ Copiada' : '❌ Error'}`);
console.log(`Imágenes: ${imagesCopied ? '✅ Copiadas' : '❌ Error'}`);
console.log("---------------------------------------------------");
console.log("Ahora puedes reiniciar el servidor para que use los archivos actualizados.");
