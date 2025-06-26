const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configurar rutas
const dbPathData = path.join(__dirname, 'data', 'prompts.db');
const dbPathRoot = path.join(__dirname, 'prompts.db');

console.log('===== HERRAMIENTA DE CORRECCIÓN PARA EL PANEL DE ADMINISTRACIÓN =====');

// Verificar las bases de datos
let dataDbExists = fs.existsSync(dbPathData);
let rootDbExists = fs.existsSync(dbPathRoot);

console.log(`Base de datos data/prompts.db: ${dataDbExists ? 'EXISTE' : 'NO EXISTE'}`);
console.log(`Base de datos prompts.db (raíz): ${rootDbExists ? 'EXISTE' : 'NO EXISTE'}`);

// Función para crear/arreglar la base de datos en data/prompts.db
function fixDataDb() {
    return new Promise((resolve, reject) => {
        // Hacer copia de seguridad si existe
        if (dataDbExists) {
            const backupPath = path.join(__dirname, 'data', `prompts_backup_${Date.now()}.db`);
            try {
                fs.copyFileSync(dbPathData, backupPath);
                console.log(`Backup de data/prompts.db creado en ${backupPath}`);
            } catch (error) {
                console.error(`Error al crear backup: ${error.message}`);
            }
        } else {
            // Crear directorio data si no existe
            if (!fs.existsSync(path.join(__dirname, 'data'))) {
                fs.mkdirSync(path.join(__dirname, 'data'));
                console.log('Directorio data/ creado');
            }
        }
        
        // Si existe la base de datos en la raíz pero no en data, copiarla
        if (rootDbExists && !dataDbExists) {
            try {
                fs.copyFileSync(dbPathRoot, dbPathData);
                console.log('Base de datos prompts.db copiada a data/prompts.db');
                dataDbExists = true;
            } catch (error) {
                console.error(`Error al copiar base de datos: ${error.message}`);
            }
        }
        
        // Abrir/crear la base de datos en data/
        const db = new sqlite3.Database(dbPathData, (err) => {
            if (err) {
                console.error(`Error al abrir/crear base de datos: ${err.message}`);
                reject(err);
                return;
            }
            
            console.log('Base de datos data/prompts.db abierta/creada correctamente');
            
            // Crear las tablas necesarias
            db.serialize(() => {
                // Tabla usuarios
                db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, salt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)", (err) => {
                    if (err) console.error(`Error al crear tabla users: ${err.message}`);
                    else console.log('Tabla users verificada/creada');
                });
                
                // Tabla categorías
                db.run("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT, slug TEXT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)", (err) => {
                    if (err) console.error(`Error al crear tabla categories: ${err.message}`);
                    else console.log('Tabla categories verificada/creada');
                });
                
                // Tabla prompts
                db.run("CREATE TABLE IF NOT EXISTS prompts (id INTEGER PRIMARY KEY, image TEXT, prompt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)", (err) => {
                    if (err) console.error(`Error al crear tabla prompts: ${err.message}`);
                    else console.log('Tabla prompts verificada/creada');
                });
                
                // Tabla relación prompts-categorías
                db.run("CREATE TABLE IF NOT EXISTS prompt_categories (id INTEGER PRIMARY KEY, prompt_id INTEGER, category_id INTEGER)", (err) => {
                    if (err) console.error(`Error al crear tabla prompt_categories: ${err.message}`);
                    else console.log('Tabla prompt_categories verificada/creada');
                });
                
                // Verificar si existe el usuario admin
                db.get("SELECT id FROM users WHERE username = 'admin'", [], (err, row) => {
                    if (err) {
                        console.error(`Error al verificar usuario admin: ${err.message}`);
                    } else if (!row) {
                        console.log('Creando usuario admin...');
                        
                        // Crear usuario admin
                        const salt = crypto.randomBytes(16).toString('hex');
                        const password = 'admin123';
                        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
                        
                        db.run("INSERT INTO users (username, password, salt) VALUES (?, ?, ?)", 
                            ['admin', hash, salt], 
                            function(err) {
                                if (err) console.error(`Error al crear usuario admin: ${err.message}`);
                                else console.log(`Usuario admin creado correctamente (admin/admin123)`);
                            }
                        );
                    } else {
                        console.log('Usuario admin ya existe');
                    }
                });
                
                // Verificar si hay prompts
                db.get("SELECT count(*) as count FROM prompts", [], (err, row) => {
                    if (err) {
                        console.error(`Error al verificar prompts: ${err.message}`);
                    } else {
                        console.log(`La base de datos contiene ${row.count} prompts`);
                        
                        // Si no hay prompts, intentar añadir uno de ejemplo
                        if (row.count === 0) {
                            console.log('Agregando prompt de ejemplo...');
                            
                            // Primero, asegurar que existe el directorio de imágenes
                            const dataImagesDir = path.join(__dirname, 'data', 'images');
                            if (!fs.existsSync(dataImagesDir)) {
                                fs.mkdirSync(dataImagesDir, { recursive: true });
                                console.log('Directorio data/images/ creado');
                            }
                            
                            // Copiar una imagen de ejemplo si existe
                            const rootImagesDir = path.join(__dirname, 'images');
                            let sampleImageName = 'placeholder.jpg';
                            let sampleImageExists = false;
                            
                            if (fs.existsSync(rootImagesDir)) {
                                const images = fs.readdirSync(rootImagesDir);
                                if (images.length > 0) {
                                    sampleImageName = images[0];
                                    const sourcePath = path.join(rootImagesDir, sampleImageName);
                                    const destPath = path.join(dataImagesDir, sampleImageName);
                                    
                                    try {
                                        fs.copyFileSync(sourcePath, destPath);
                                        console.log(`Imagen de ejemplo (${sampleImageName}) copiada a data/images/`);
                                        sampleImageExists = true;
                                    } catch (error) {
                                        console.error(`Error al copiar imagen de ejemplo: ${error.message}`);
                                    }
                                }
                            }
                            
                            // Crear prompt de ejemplo
                            if (sampleImageExists) {
                                db.run("INSERT INTO prompts (image, prompt) VALUES (?, ?)",
                                    [sampleImageName, 'Este es un prompt de ejemplo. Por favor, añade tus propios prompts.'],
                                    function(err) {
                                        if (err) console.error(`Error al crear prompt de ejemplo: ${err.message}`);
                                        else console.log(`Prompt de ejemplo creado correctamente con ID ${this.lastID}`);
                                    }
                                );
                            }
                        }
                    }
                });
            });
            
            // Mantener la conexión abierta por un momento para permitir que todas las consultas se completen
            setTimeout(() => {
                // Copiar la base de datos a la raíz para asegurar coherencia
                db.close(() => {
                    console.log('Base de datos data/prompts.db cerrada');
                    
                    try {
                        fs.copyFileSync(dbPathData, dbPathRoot);
                        console.log('Base de datos copiada a prompts.db en la raíz');
                    } catch (error) {
                        console.error(`Error al copiar base de datos a la raíz: ${error.message}`);
                    }
                    
                    resolve();
                });
            }, 2000);
        });
    });
}

// Ejecutar corrección
fixDataDb().then(() => {
    console.log('\n===== PROCESO DE CORRECCIÓN FINALIZADO =====');
    console.log(`
Para que los cambios surtan efecto:
1. Reinicia el servidor Node.js
2. Asegúrate de iniciar sesión en http://localhost:3000/login.html con admin/admin123
3. Verifica que puedas ver y añadir prompts en el panel de administración

Si sigues teniendo problemas:
- Verifica los logs del servidor al intentar guardar un nuevo prompt
- Asegúrate de haber seleccionado un archivo de imagen válido
- Comprueba que el campo de texto del prompt no esté vacío
`);
}).catch(error => {
    console.error(`Error durante el proceso de corrección: ${error.message}`);
});
