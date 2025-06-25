const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Configurar rutas
const dbPathData = path.join(__dirname, 'data', 'prompts.db');
const dbPathRoot = path.join(__dirname, 'prompts.db');
const dataImagesDir = path.join(__dirname, 'data', 'images');
const rootImagesDir = path.join(__dirname, 'images');

console.log('===== HERRAMIENTA DE REPARACIÓN DE BASE DE DATOS =====');

// Asegurar que los directorios existan
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    console.log('Creando directorio data/');
    fs.mkdirSync(path.join(__dirname, 'data'));
}

if (!fs.existsSync(dataImagesDir)) {
    console.log('Creando directorio data/images/');
    fs.mkdirSync(dataImagesDir);
}

if (!fs.existsSync(rootImagesDir)) {
    console.log('Creando directorio images/');
    fs.mkdirSync(rootImagesDir);
}

// Verificar cuál base de datos existe
let activeDbPath = null;
let shouldCopyDb = false;

if (fs.existsSync(dbPathData)) {
    console.log('Base de datos encontrada en data/prompts.db');
    activeDbPath = dbPathData;
    
    if (!fs.existsSync(dbPathRoot)) {
        console.log('Creando copia en prompts.db (raíz)');
        shouldCopyDb = true;
    }
} else if (fs.existsSync(dbPathRoot)) {
    console.log('Base de datos encontrada en prompts.db (raíz)');
    activeDbPath = dbPathRoot;
    
    console.log('Creando copia en data/prompts.db');
    shouldCopyDb = true;
    
    // Invertir origen y destino
    const temp = dbPathData;
    dbPathData = dbPathRoot;
    dbPathRoot = temp;
} else {
    console.log('¡No se encontró ninguna base de datos! Creando una nueva en data/prompts.db');
    
    // Crear base de datos vacía
    const db = new sqlite3.Database(dbPathData, (err) => {
        if (err) {
            console.error(`Error al crear base de datos: ${err.message}`);
            process.exit(1);
        }
        
        console.log('Base de datos creada correctamente');
        
        // Crear tablas
        db.serialize(() => {
            db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, salt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            db.run("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT, slug TEXT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            db.run("CREATE TABLE IF NOT EXISTS prompts (id INTEGER PRIMARY KEY, image TEXT, prompt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            db.run("CREATE TABLE IF NOT EXISTS prompt_categories (id INTEGER PRIMARY KEY, prompt_id INTEGER, category_id INTEGER)");
            
            // Crear usuario admin por defecto
            const crypto = require('crypto');
            const salt = crypto.randomBytes(16).toString('hex');
            const password = 'admin123';
            const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
            
            db.run("INSERT INTO users (username, password, salt) VALUES (?, ?, ?)", 
                ['admin', hash, salt], 
                function(err) {
                    if (err) {
                        console.error(`Error al crear usuario admin: ${err.message}`);
                    } else {
                        console.log('Usuario admin creado (admin/admin123)');
                    }
                }
            );
        });
        
        activeDbPath = dbPathData;
    });
    
    shouldCopyDb = true;
}

// Copiar base de datos si es necesario
if (shouldCopyDb) {
    try {
        fs.copyFileSync(activeDbPath, dbPathRoot);
        console.log(`Base de datos copiada de ${activeDbPath} a ${dbPathRoot}`);
    } catch (error) {
        console.error(`Error al copiar base de datos: ${error.message}`);
    }
}

// Verificar imágenes
console.log('\n=== VERIFICANDO IMÁGENES ===');

// Conectar a la base de datos activa
const db = new sqlite3.Database(activeDbPath, (err) => {
    if (err) {
        console.error(`Error al abrir base de datos: ${err.message}`);
        process.exit(1);
    }
    
    // Obtener todas las imágenes de la base de datos
    db.all("SELECT id, image, prompt FROM prompts", [], (err, rows) => {
        if (err) {
            console.error(`Error al consultar prompts: ${err.message}`);
            db.close();
            process.exit(1);
        }
        
        console.log(`Encontrados ${rows.length} prompts en la base de datos`);
        
        // Procesar cada imagen
        let missingImages = [];
        
        rows.forEach(row => {
            let imageName = row.image;
            
            // Normalizar el nombre de archivo (quitar prefijos)
            if (imageName.startsWith('/images/')) {
                imageName = imageName.substring(8);
            } else if (imageName.startsWith('images/')) {
                imageName = imageName.substring(7);
            }
            
            const pathInData = path.join(dataImagesDir, imageName);
            const pathInRoot = path.join(rootImagesDir, imageName);
            
            const existsInData = fs.existsSync(pathInData);
            const existsInRoot = fs.existsSync(pathInRoot);
            
            // Si la imagen no existe en ninguno de los dos lugares, agregarla a la lista
            if (!existsInData && !existsInRoot) {
                missingImages.push({
                    id: row.id,
                    image: row.image,
                    imageName: imageName,
                    prompt: row.prompt
                });
            } 
            // Copiar imágenes entre directorios para asegurar que estén en ambos lugares
            else {
                if (existsInData && !existsInRoot) {
                    try {
                        fs.copyFileSync(pathInData, pathInRoot);
                        console.log(`Imagen copiada de data/images/${imageName} a images/${imageName}`);
                    } catch (error) {
                        console.error(`Error al copiar imagen ${imageName} a directorio raíz: ${error.message}`);
                    }
                } else if (existsInRoot && !existsInData) {
                    try {
                        fs.copyFileSync(pathInRoot, pathInData);
                        console.log(`Imagen copiada de images/${imageName} a data/images/${imageName}`);
                    } catch (error) {
                        console.error(`Error al copiar imagen ${imageName} a directorio data: ${error.message}`);
                    }
                }
            }
        });
        
        console.log(`\n=== RESULTADOS ===`);
        console.log(`Total prompts: ${rows.length}`);
        console.log(`Imágenes faltantes: ${missingImages.length}`);
        
        if (missingImages.length > 0) {
            console.log('\nPrompts con imágenes faltantes:');
            missingImages.forEach(item => {
                console.log(`- ID ${item.id}: "${item.image}" - "${item.prompt.substring(0, 30)}..."`);
                
                // Corregir la referencia en la base de datos para usar placeholder
                db.run("UPDATE prompts SET image = ? WHERE id = ?", ['placeholder.jpg', item.id], function(err) {
                    if (err) {
                        console.error(`Error al actualizar imagen para prompt ID ${item.id}: ${err.message}`);
                    } else {
                        console.log(`  * Actualizado a usar placeholder.jpg`);
                    }
                });
            });
            
            // Asegurar que placeholder.jpg existe en ambos directorios
            const placeholderInData = path.join(dataImagesDir, 'placeholder.jpg');
            const placeholderInRoot = path.join(rootImagesDir, 'placeholder.jpg');
            
            if (!fs.existsSync(placeholderInData) && fs.existsSync(placeholderInRoot)) {
                try {
                    fs.copyFileSync(placeholderInRoot, placeholderInData);
                    console.log('placeholder.jpg copiado a data/images/');
                } catch (error) {
                    console.error(`Error al copiar placeholder.jpg a data/images/: ${error.message}`);
                }
            } else if (!fs.existsSync(placeholderInRoot) && fs.existsSync(placeholderInData)) {
                try {
                    fs.copyFileSync(placeholderInData, placeholderInRoot);
                    console.log('placeholder.jpg copiado a images/');
                } catch (error) {
                    console.error(`Error al copiar placeholder.jpg a images/: ${error.message}`);
                }
            } else if (!fs.existsSync(placeholderInRoot) && !fs.existsSync(placeholderInData)) {
                console.error('¡ALERTA! No se encontró placeholder.jpg en ningún directorio');
            }
        }
        
        console.log('\n=== VERIFICACIÓN COMPLETA ===');
        console.log('Se ha sincronizado la base de datos y las imágenes entre data/ y la raíz.');
        console.log('Las imágenes faltantes han sido actualizadas para usar placeholder.jpg.');
        console.log('\nPara completar la reparación:');
        console.log('1. Reinicia el servidor (Ctrl+C y node server.js)');
        console.log('2. Verifica que los prompts se muestran correctamente en la galería');
        console.log('3. Intenta agregar un nuevo prompt desde el panel de administración');
        
        // Cerrar la base de datos
        db.close();
    });
});
