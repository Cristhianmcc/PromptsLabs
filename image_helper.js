/**
 * image_helper.js - Módulo centralizado para manejar imágenes
 * 
 * Este módulo proporciona funciones para gestionar rutas de imágenes,
 * normalizar rutas entre frontend y backend, y mejorar la robustez
 * del manejo de imágenes en toda la aplicación.
 */

const fs = require('fs');
const path = require('path');

// Configuración de rutas
const IMAGES_ROOT = '/images'; // Ruta base para URLs de imágenes en el frontend
const DEFAULT_PLACEHOLDER = 'placeholder.jpg';

/**
 * Normaliza una ruta de imagen para uso en el frontend
 * @param {string} imagePath - Ruta de imagen original (puede venir en varios formatos)
 * @param {boolean} fullUrl - Si es true, devuelve una URL completa con dominio (para compartir)
 * @returns {string} - Ruta normalizada
 */
function normalizeImagePath(imagePath, fullUrl = false) {
    // Si no hay ruta de imagen o está vacía, usar placeholder
    if (!imagePath || imagePath.trim() === '') {
        return `${IMAGES_ROOT}/${DEFAULT_PLACEHOLDER}`;
    }
    
    let processedPath = imagePath.trim();
    
    // Si ya tiene la ruta completa con http, devolverla
    if (processedPath.startsWith('http')) {
        return processedPath;
    }
    
    // Si ya viene con la ruta correcta desde el servidor (/images/...), usarla directamente
    if (processedPath.startsWith(`${IMAGES_ROOT}/`)) {
        return processedPath;
    }
    
    // Si ya tiene 'images/' al inicio (sin barra), agregarle la barra
    if (processedPath.startsWith('images/')) {
        return `/${processedPath}`;
    }
    
    // Verificar si es solo un nombre de archivo (sin directorios)
    if (!processedPath.includes('/') && !processedPath.includes('\\')) {
        return `${IMAGES_ROOT}/${processedPath}`;
    }
    
    // Verificar si es una ruta relativa de data/images
    if (processedPath.startsWith('data/images/')) {
        return `/${processedPath.substring(5)}`; // Quitar 'data/' del inicio
    }
    
    // Para cualquier otro caso, añadir el prefijo '/images/'
    return `${IMAGES_ROOT}/${processedPath}`;
}

/**
 * Verifica si una imagen existe en el sistema de archivos
 * @param {string} filename - Nombre del archivo de imagen
 * @param {string} baseDir - Directorio base donde buscar la imagen
 * @returns {boolean} - true si la imagen existe
 */
function imageExists(filename, baseDir) {
    try {
        // Extraer solo el nombre del archivo si viene con path
        const basename = path.basename(filename);
        const imagePath = path.join(baseDir, basename);
        return fs.existsSync(imagePath);
    } catch (error) {
        console.error(`Error al verificar si existe la imagen ${filename}:`, error);
        return false;
    }
}

/**
 * Obtiene la ruta completa del sistema de archivos para una imagen
 * @param {string} filename - Nombre o ruta relativa del archivo
 * @param {object} options - Opciones adicionales
 * @returns {string|null} - Ruta completa o null si no se encuentra
 */
function getImageFilePath(filename, options = {}) {
    const { 
        dataDir = path.join(process.cwd(), 'data', 'images'),
        rootDir = path.join(process.cwd(), 'images'),
        preferDataDir = true
    } = options;
    
    try {
        // Extraer solo el nombre del archivo si viene con path
        const basename = path.basename(filename);
        
        // Primero buscar en el directorio preferido
        const primaryDir = preferDataDir ? dataDir : rootDir;
        const secondaryDir = preferDataDir ? rootDir : dataDir;
        
        const primaryPath = path.join(primaryDir, basename);
        if (fs.existsSync(primaryPath)) {
            return primaryPath;
        }
        
        // Si no se encuentra, buscar en el directorio secundario
        const secondaryPath = path.join(secondaryDir, basename);
        if (fs.existsSync(secondaryPath)) {
            return secondaryPath;
        }
        
        // Si no se encuentra en ningún lado, devolver null
        return null;
    } catch (error) {
        console.error(`Error al obtener ruta de imagen ${filename}:`, error);
        return null;
    }
}

/**
 * Genera una respuesta HTTP para una imagen
 * @param {object} res - Objeto de respuesta Express
 * @param {string} imagePath - Ruta de la imagen solicitada
 * @param {object} options - Opciones adicionales
 */
function serveImage(res, imagePath, options = {}) {
    const {
        dataDir = path.join(process.cwd(), 'data', 'images'),
        rootDir = path.join(process.cwd(), 'images'),
        placeholderImage = DEFAULT_PLACEHOLDER
    } = options;
    
    // Obtener la ruta completa del sistema de archivos
    const fullPath = getImageFilePath(imagePath, { dataDir, rootDir });
    
    if (fullPath) {
        // Si la imagen existe, enviarla
        res.sendFile(fullPath);
    } else {
        // Si no existe, enviar placeholder
        console.log(`Imagen no encontrada: ${imagePath}, sirviendo placeholder`);
        
        // Buscar placeholder en ambos directorios
        const placeholderPath = getImageFilePath(placeholderImage, { dataDir, rootDir });
        
        if (placeholderPath) {
            res.sendFile(placeholderPath);
        } else {
            // Si no hay placeholder, enviar un error 404
            res.status(404).send('Imagen no encontrada');
        }
    }
}

/**
 * Sincroniza imágenes entre directorios
 * @param {string} sourceDir - Directorio fuente
 * @param {string} targetDir - Directorio destino
 * @param {object} options - Opciones adicionales
 * @returns {object} - Resultado de la sincronización
 */
function syncImages(sourceDir, targetDir, options = {}) {
    const {
        onlyCopyMissing = true,
        imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        priorityImages = ['placeholder.jpg']
    } = options;
    
    const result = {
        copied: 0,
        errors: 0,
        skipped: 0,
        details: []
    };
    
    // Asegurar que los directorios existan
    if (!fs.existsSync(sourceDir)) {
        throw new Error(`El directorio fuente no existe: ${sourceDir}`);
    }
    
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Obtener lista de imágenes en el directorio fuente
    const sourceImages = fs.readdirSync(sourceDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
    });
    
    // Obtener lista de imágenes en el directorio destino
    const targetImages = fs.existsSync(targetDir) 
        ? fs.readdirSync(targetDir)
        : [];
    
    // Primero procesar imágenes prioritarias
    const priorityFilesToProcess = sourceImages.filter(img => 
        priorityImages.includes(img)
    );
    
    // Luego procesar el resto de imágenes
    const regularFilesToProcess = sourceImages.filter(img => 
        !priorityImages.includes(img)
    );
    
    // Función para copiar una imagen
    const copyImage = (filename) => {
        const sourcePath = path.join(sourceDir, filename);
        const targetPath = path.join(targetDir, filename);
        
        // Si la opción onlyCopyMissing está activada y el archivo ya existe, saltarlo
        if (onlyCopyMissing && targetImages.includes(filename)) {
            result.skipped++;
            result.details.push({ file: filename, status: 'skipped' });
            return;
        }
        
        try {
            fs.copyFileSync(sourcePath, targetPath);
            result.copied++;
            result.details.push({ file: filename, status: 'copied' });
        } catch (err) {
            result.errors++;
            result.details.push({ 
                file: filename, 
                status: 'error',
                error: err.message 
            });
        }
    };
    
    // Copiar primero las imágenes prioritarias
    priorityFilesToProcess.forEach(copyImage);
    
    // Luego copiar el resto
    regularFilesToProcess.forEach(copyImage);
    
    return result;
}

module.exports = {
    normalizeImagePath,
    imageExists,
    getImageFilePath,
    serveImage,
    syncImages,
    IMAGES_ROOT,
    DEFAULT_PLACEHOLDER
};
