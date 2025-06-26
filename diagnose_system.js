const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Rutas de archivos importantes
const dbPathData = path.join(__dirname, 'data', 'prompts.db');
const dbPathRoot = path.join(__dirname, 'prompts.db');
const adminJsPath = path.join(__dirname, 'admin.js');
const serverJsPath = path.join(__dirname, 'server.js');

console.log('===== DIAGNÓSTICO COMPLETO DEL SISTEMA =====');
console.log(`Fecha y hora: ${new Date().toISOString()}`);

// 1. Verificar estructura de archivos
console.log('\n=== ESTRUCTURA DE ARCHIVOS ===');
const dataDir = fs.existsSync(path.join(__dirname, 'data'));
const dataImagesDir = fs.existsSync(path.join(__dirname, 'data', 'images'));
const imagesDir = fs.existsSync(path.join(__dirname, 'images'));

console.log(`- Directorio data/: ${dataDir ? 'EXISTE' : 'NO EXISTE'}`);
console.log(`- Directorio data/images/: ${dataImagesDir ? 'EXISTE' : 'NO EXISTE'}`);
console.log(`- Directorio images/: ${imagesDir ? 'EXISTE' : 'NO EXISTE'}`);

// 2. Verificar bases de datos
console.log('\n=== BASES DE DATOS ===');
const dataDbExists = fs.existsSync(dbPathData);
const rootDbExists = fs.existsSync(dbPathRoot);

console.log(`- Base de datos data/prompts.db: ${dataDbExists ? 'EXISTE' : 'NO EXISTE'}`);
console.log(`- Base de datos prompts.db (raíz): ${rootDbExists ? 'EXISTE' : 'NO EXISTE'}`);

// 3. Verificar contenido de las bases de datos
console.log('\n=== CONTENIDO DE LAS BASES DE DATOS ===');

function checkDatabase(dbPath, name) {
    return new Promise((resolve) => {
        if (!fs.existsSync(dbPath)) {
            console.log(`La base de datos ${name} no existe.`);
            resolve();
            return;
        }
        
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error(`Error al abrir ${name}: ${err.message}`);
                resolve();
                return;
            }
            
            console.log(`\nExaminando ${name}:`);
            
            // Verificar tablas
            db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
                if (err) {
                    console.error(`Error al listar tablas en ${name}: ${err.message}`);
                    db.close();
                    resolve();
                    return;
                }
                
                console.log(`Tablas encontradas: ${tables.map(t => t.name).join(', ')}`);
                
                // Verificar contenido de prompts
                db.get("SELECT COUNT(*) as count FROM prompts", [], (err, row) => {
                    if (err) {
                        console.error(`Error al contar prompts en ${name}: ${err.message}`);
                        db.close();
                        resolve();
                        return;
                    }
                    
                    console.log(`Número de prompts: ${row.count}`);
                    
                    if (row.count > 0) {
                        // Mostrar algunos prompts de ejemplo
                        db.all("SELECT id, image, substr(prompt, 1, 30) as prompt_preview FROM prompts LIMIT 3", [], (err, rows) => {
                            if (err) {
                                console.error(`Error al obtener prompts de muestra en ${name}: ${err.message}`);
                            } else {
                                console.log('Ejemplos de prompts:');
                                rows.forEach(row => {
                                    console.log(`* ID ${row.id}: Imagen "${row.image}", Prompt "${row.prompt_preview}..."`);
                                });
                            }
                            
                            // Verificar usuario admin
                            db.get("SELECT id, username FROM users WHERE username='admin'", [], (err, user) => {
                                if (err) {
                                    console.error(`Error al verificar usuario admin en ${name}: ${err.message}`);
                                } else if (user) {
                                    console.log(`Usuario admin: EXISTE (ID ${user.id})`);
                                } else {
                                    console.log('Usuario admin: NO EXISTE');
                                }
                                
                                db.close();
                                resolve();
                            });
                        });
                    } else {
                        console.log('No hay prompts en esta base de datos.');
                        db.close();
                        resolve();
                    }
                });
            });
        });
    });
}

async function runDatabaseChecks() {
    await checkDatabase(dbPathData, 'data/prompts.db');
    await checkDatabase(dbPathRoot, 'prompts.db (raíz)');
    
    // 4. Verificar admin.js para problemas
    console.log('\n=== VERIFICACIÓN DE ADMIN.JS ===');
    try {
        const adminJsContent = fs.readFileSync(adminJsPath, 'utf-8');
        
        // Buscar problemas comunes
        console.log('Verificando problemas en admin.js:');
        
        if (adminJsContent.includes('const promptsTable = document.getElementById(\'pr        })')) {
            console.log('- PROBLEMA DETECTADO: Hay un error de sintaxis en admin.js');
            console.log('  El código tiene texto corrupto cerca de la línea "const promptsTable = document.getElementById(\'pr        })"');
        }
        
        if (!adminJsContent.includes('function ensureCorrectImagePath')) {
            console.log('- PROBLEMA DETECTADO: No se encuentra la función ensureCorrectImagePath()');
        }
        
        if (!adminJsContent.includes('function loadPrompts')) {
            console.log('- PROBLEMA DETECTADO: No se encuentra la función loadPrompts()');
        }
        
        // 5. Verificar server.js para configuración
        console.log('\n=== VERIFICACIÓN DE SERVER.JS ===');
        const serverJsContent = fs.readFileSync(serverJsPath, 'utf-8');
        
        // Buscar qué base de datos está configurada
        console.log('Verificando configuración de base de datos en server.js:');
        
        if (serverJsContent.includes('dbPath = path.join(__dirname, \'data\', \'prompts.db\')')) {
            console.log('- Server.js está configurado para usar data/prompts.db');
        } else if (serverJsContent.includes('dbPath = path.join(__dirname, \'prompts.db\')')) {
            console.log('- Server.js está configurado para usar prompts.db en la raíz');
        } else {
            console.log('- No se pudo determinar qué base de datos está configurada en server.js');
        }
        
        // 6. Crear script de reparación
        console.log('\n=== CREANDO SCRIPT DE REPARACIÓN ===');
        
        // Contenido del script de reparación
        const repairScript = `const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Rutas de archivos importantes
const dbPathData = path.join(__dirname, 'data', 'prompts.db');
const dbPathRoot = path.join(__dirname, 'prompts.db');
const adminJsPath = path.join(__dirname, 'admin.js');

console.log('===== HERRAMIENTA DE REPARACIÓN DEL SISTEMA =====');

// 1. Verificar y crear directorios necesarios
console.log('\\n1. Verificando directorios...');
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
    console.log('- Directorio data/ creado');
}

if (!fs.existsSync(path.join(__dirname, 'data', 'images'))) {
    fs.mkdirSync(path.join(__dirname, 'data', 'images'));
    console.log('- Directorio data/images/ creado');
}

if (!fs.existsSync(path.join(__dirname, 'images'))) {
    fs.mkdirSync(path.join(__dirname, 'images'));
    console.log('- Directorio images/ creado');
}

// 2. Reparar base de datos
console.log('\\n2. Reparando bases de datos...');
const dataDbExists = fs.existsSync(dbPathData);
const rootDbExists = fs.existsSync(dbPathRoot);

if (dataDbExists && rootDbExists) {
    // Realizar backup de ambas
    const dataBackupPath = path.join(__dirname, 'data', \`prompts_backup_\${Date.now()}.db\`);
    const rootBackupPath = path.join(__dirname, \`prompts_backup_\${Date.now()}.db\`);
    
    fs.copyFileSync(dbPathData, dataBackupPath);
    console.log(\`- Backup de data/prompts.db creado en \${dataBackupPath}\`);
    
    fs.copyFileSync(dbPathRoot, rootBackupPath);
    console.log(\`- Backup de prompts.db creado en \${rootBackupPath}\`);
    
    // Usar la base de datos con más prompts como la principal
    const dbData = new sqlite3.Database(dbPathData, sqlite3.OPEN_READONLY);
    const dbRoot = new sqlite3.Database(dbPathRoot, sqlite3.OPEN_READONLY);
    
    dbData.get("SELECT COUNT(*) as count FROM prompts", [], (err, dataRow) => {
        dbRoot.get("SELECT COUNT(*) as count FROM prompts", [], (err, rootRow) => {
            const dataCount = err ? 0 : dataRow.count;
            const rootCount = err ? 0 : rootRow.count;
            
            dbData.close();
            dbRoot.close();
            
            console.log(\`- data/prompts.db: \${dataCount} prompts\`);
            console.log(\`- prompts.db: \${rootCount} prompts\`);
            
            if (dataCount >= rootCount) {
                console.log('- Usando data/prompts.db como principal');
                fs.copyFileSync(dbPathData, dbPathRoot);
                console.log('- data/prompts.db copiado a prompts.db');
            } else {
                console.log('- Usando prompts.db como principal');
                fs.copyFileSync(dbPathRoot, dbPathData);
                console.log('- prompts.db copiado a data/prompts.db');
            }
            
            // 3. Sincronizar imágenes
            console.log('\\n3. Sincronizando imágenes entre directorios...');
            syncImages();
        });
    });
} else if (dataDbExists) {
    console.log('- Solo existe data/prompts.db');
    fs.copyFileSync(dbPathData, dbPathRoot);
    console.log('- data/prompts.db copiado a prompts.db');
    syncImages();
} else if (rootDbExists) {
    console.log('- Solo existe prompts.db');
    fs.copyFileSync(dbPathRoot, dbPathData);
    console.log('- prompts.db copiado a data/prompts.db');
    syncImages();
} else {
    console.log('- No existe ninguna base de datos, creando nueva...');
    createNewDatabase();
}

function syncImages() {
    try {
        const dataImagesDir = path.join(__dirname, 'data', 'images');
        const imagesDir = path.join(__dirname, 'images');
        
        // Copiar de images/ a data/images/
        if (fs.existsSync(imagesDir)) {
            const files = fs.readdirSync(imagesDir);
            files.forEach(file => {
                const sourcePath = path.join(imagesDir, file);
                const destPath = path.join(dataImagesDir, file);
                
                if (fs.statSync(sourcePath).isFile() && !fs.existsSync(destPath)) {
                    fs.copyFileSync(sourcePath, destPath);
                    console.log(\`- Copiado \${file} a data/images/\`);
                }
            });
        }
        
        // Copiar de data/images/ a images/
        if (fs.existsSync(dataImagesDir)) {
            const files = fs.readdirSync(dataImagesDir);
            files.forEach(file => {
                const sourcePath = path.join(dataImagesDir, file);
                const destPath = path.join(imagesDir, file);
                
                if (fs.statSync(sourcePath).isFile() && !fs.existsSync(destPath)) {
                    fs.copyFileSync(sourcePath, destPath);
                    console.log(\`- Copiado \${file} a images/\`);
                }
            });
        }
        
        console.log('- Sincronización de imágenes completada');
        
        // 4. Verificar y reparar admin.js si es necesario
        checkAdminJs();
    } catch (error) {
        console.error(\`Error al sincronizar imágenes: \${error.message}\`);
    }
}

function createNewDatabase() {
    try {
        const db = new sqlite3.Database(dbPathData, (err) => {
            if (err) {
                console.error(\`Error al crear nueva base de datos: \${err.message}\`);
                return;
            }
            
            console.log('- Nueva base de datos creada en data/prompts.db');
            
            // Crear tablas
            db.serialize(() => {
                db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, salt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
                db.run("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT, slug TEXT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
                db.run("CREATE TABLE IF NOT EXISTS prompts (id INTEGER PRIMARY KEY, image TEXT, prompt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
                db.run("CREATE TABLE IF NOT EXISTS prompt_categories (id INTEGER PRIMARY KEY, prompt_id INTEGER, category_id INTEGER)");
                
                console.log('- Tablas creadas correctamente');
                
                // Crear usuario admin
                const crypto = require('crypto');
                const salt = crypto.randomBytes(16).toString('hex');
                const password = 'admin123';
                const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
                
                db.run("INSERT INTO users (username, password, salt) VALUES (?, ?, ?)", 
                    ['admin', hash, salt], 
                    function(err) {
                        if (err) {
                            console.error(\`Error al crear usuario admin: \${err.message}\`);
                        } else {
                            console.log('- Usuario admin creado (admin/admin123)');
                        }
                        
                        // Copia de base de datos a la raíz
                        db.close(() => {
                            fs.copyFileSync(dbPathData, dbPathRoot);
                            console.log('- Nueva base de datos copiada a prompts.db');
                            
                            // Sincronizar imágenes
                            syncImages();
                        });
                    }
                );
            });
        });
    } catch (error) {
        console.error(\`Error al crear base de datos: \${error.message}\`);
    }
}

function checkAdminJs() {
    console.log('\\n4. Verificando admin.js...');
    
    try {
        const adminJsContent = fs.readFileSync(adminJsPath, 'utf-8');
        
        if (adminJsContent.includes('const promptsTable = document.getElementById(\\'pr        })')) {
            console.log('- PROBLEMA DETECTADO: Sintaxis corrupta en admin.js');
            
            // Hacer backup
            const backupPath = path.join(__dirname, 'admin.js.bak');
            fs.writeFileSync(backupPath, adminJsContent);
            console.log(\`- Backup guardado en \${backupPath}\`);
            
            // Reparar la primera parte del archivo
            // Nota: Este es solo un fragmento inicial, el archivo completo tendría que ser reconstruido
            const fixedContent = \`// Script para la funcionalidad del panel de administración

document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let deletePromptId = null;
    
    // Elementos DOM
    const promptsTable = document.getElementById('promptsTable');
    const addPromptForm = document.getElementById('addPromptForm');
    const editPromptForm = document.getElementById('editPromptForm');
    const saveNewPromptBtn = document.getElementById('saveNewPrompt');
    const saveEditPromptBtn = document.getElementById('saveEditPrompt');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const changeImageCheckbox = document.getElementById('changeImage');
    const newImageContainer = document.getElementById('newImageContainer');
\`;
            
            // Solo escribir el encabezado corregido
            fs.writeFileSync(\`\${adminJsPath}.fixed_header\`, fixedContent);
            console.log(\`- Encabezado corregido guardado en \${adminJsPath}.fixed_header\`);
            console.log('- AVISO: admin.js está corrupto. Se necesita reconstruir el archivo completo.');
            console.log('  Recomendación: Descargar una copia nueva del archivo admin.js');
        } else {
            console.log('- admin.js parece estar en buen estado sintáctico');
        }
    } catch (error) {
        console.error(\`Error al verificar admin.js: \${error.message}\`);
    }
    
    console.log('\\n===== REPARACIÓN COMPLETADA =====');
    console.log('Reinicia el servidor para aplicar los cambios.');
}`;
        
        // Guardar el script de reparación
        const repairScriptPath = path.join(__dirname, 'repair_system.js');
        fs.writeFileSync(repairScriptPath, repairScript);
        console.log(`Script de reparación creado en ${repairScriptPath}`);
        console.log('Ejecuta: node repair_system.js');
        
        console.log('\n=== FIN DEL DIAGNÓSTICO ===');
    } catch (error) {
        console.error(`Error al verificar archivos: ${error.message}`);
    }
}

runDatabaseChecks();
