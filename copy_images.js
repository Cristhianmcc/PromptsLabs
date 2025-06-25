/**
 * Script para verificar y copiar imágenes necesarias
 */

const fs = require('fs');
const path = require('path');

// Configurar rutas
const sourceDir = path.join(__dirname, 'images');
const targetDir = path.join(__dirname, 'data', 'images');

// Asegurar que el directorio destino existe
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Directorio creado: ${targetDir}`);
}

// Verificar si el directorio fuente existe
if (!fs.existsSync(sourceDir)) {
    console.error(`Error: El directorio de imágenes fuente no existe: ${sourceDir}`);
    process.exit(1);
}

// Obtener la lista de imágenes en el directorio fuente
let images;
try {
    images = fs.readdirSync(sourceDir).filter(file => {
        // Solo incluir archivos de imagen
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
} catch (err) {
    console.error('Error al leer directorio de imágenes:', err);
    process.exit(1);
}

console.log(`Encontradas ${images.length} imágenes en ${sourceDir}`);

// Verificar si las imágenes numeradas (1.jpg, 2.jpg, etc.) existen
const numericImages = [];
for (let i = 1; i <= 20; i++) {
    const filename = `${i}.jpg`;
    if (images.includes(filename)) {
        numericImages.push(filename);
    }
}

console.log(`Imágenes numeradas encontradas: ${numericImages.length}`);

// Copiar imágenes al directorio destino
let copied = 0;
let errors = 0;

// Primero asegurarse de que placeholder.jpg existe
if (images.includes('placeholder.jpg')) {
    try {
        fs.copyFileSync(
            path.join(sourceDir, 'placeholder.jpg'), 
            path.join(targetDir, 'placeholder.jpg')
        );
        console.log('✓ placeholder.jpg copiada correctamente');
        copied++;
    } catch (err) {
        console.error('✗ Error al copiar placeholder.jpg:', err.message);
        errors++;
    }
} else {
    console.warn('⚠ placeholder.jpg no encontrada en el directorio fuente');
}

// Luego copiar las imágenes numeradas (importantes para defaultData.js)
numericImages.forEach(filename => {
    try {
        fs.copyFileSync(
            path.join(sourceDir, filename), 
            path.join(targetDir, filename)
        );
        console.log(`✓ ${filename} copiada correctamente`);
        copied++;
    } catch (err) {
        console.error(`✗ Error al copiar ${filename}:`, err.message);
        errors++;
    }
});

// Finalmente, copiar otras imágenes si es necesario
const otherImages = images.filter(img => 
    img !== 'placeholder.jpg' && !numericImages.includes(img)
);

if (otherImages.length > 0) {
    console.log(`\nCopiando ${otherImages.length} imágenes adicionales...`);
    
    otherImages.forEach(filename => {
        try {
            fs.copyFileSync(
                path.join(sourceDir, filename), 
                path.join(targetDir, filename)
            );
            copied++;
        } catch (err) {
            console.error(`Error al copiar ${filename}:`, err.message);
            errors++;
        }
    });
}

console.log('\nResumen:');
console.log(`✓ ${copied} imágenes copiadas correctamente`);
console.log(`✗ ${errors} errores durante la copia`);
console.log(`Total de imágenes en directorio destino: ${fs.readdirSync(targetDir).length}`);
