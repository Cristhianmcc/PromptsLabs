const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Configurar rutas
const dbPathData = path.join(__dirname, 'data', 'prompts.db');
const dbPathRoot = path.join(__dirname, 'prompts.db');
const backupPath = path.join(__dirname, 'data', `prompts_backup_${Date.now()}.db`);

console.log('===== HERRAMIENTA DE RESTAURACIÓN DE BASE DE DATOS =====');

// Verificar cuál base de datos existe y hacer backup
let sourceDbPath = null;

if (fs.existsSync(dbPathData)) {
    console.log(`Base de datos encontrada en ${dbPathData}`);
    sourceDbPath = dbPathData;
} else if (fs.existsSync(dbPathRoot)) {
    console.log(`Base de datos encontrada en ${dbPathRoot}`);
    sourceDbPath = dbPathRoot;
} else {
    console.error('No se encontró ninguna base de datos. No se puede realizar la restauración.');
    process.exit(1);
}

// Hacer copia de seguridad
try {
    fs.copyFileSync(sourceDbPath, backupPath);
    console.log(`Backup creado en: ${backupPath}`);
} catch (error) {
    console.error(`Error al crear backup: ${error.message}`);
    process.exit(1);
}

// Conectar a la base de datos de origen para extraer los datos
const sourceDb = new sqlite3.Database(sourceDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(`Error al abrir base de datos de origen: ${err.message}`);
        process.exit(1);
    }
    
    console.log('Conectado a la base de datos de origen. Extrayendo datos...');
    
    // Extraer usuarios
    sourceDb.all("SELECT username, password, salt FROM users", [], (err, users) => {
        if (err) {
            console.error(`Error al extraer usuarios: ${err.message}`);
            sourceDb.close();
            process.exit(1);
        }
        
        console.log(`Extraídos ${users.length} usuarios`);
        
        // Extraer categorías
        sourceDb.all("SELECT name, slug, description FROM categories", [], (err, categories) => {
            if (err) {
                console.error(`Error al extraer categorías: ${err.message}`);
                sourceDb.close();
                process.exit(1);
            }
            
            console.log(`Extraídas ${categories.length} categorías`);
            
            // Extraer prompts
            sourceDb.all("SELECT id, image, prompt FROM prompts", [], (err, prompts) => {
                if (err) {
                    console.error(`Error al extraer prompts: ${err.message}`);
                    sourceDb.close();
                    process.exit(1);
                }
                
                console.log(`Extraídos ${prompts.length} prompts`);
                
                // Extraer relaciones prompt-categoría
                sourceDb.all("SELECT prompt_id, category_id FROM prompt_categories", [], (err, promptCategories) => {
                    if (err) {
                        console.error(`Error al extraer relaciones prompt-categoría: ${err.message}`);
                        sourceDb.close();
                        process.exit(1);
                    }
                    
                    console.log(`Extraídas ${promptCategories.length} relaciones prompt-categoría`);
                    sourceDb.close();
                    
                    // Crear nueva base de datos
                    console.log('\nCreando nueva base de datos limpia...');
                    
                    // Eliminar bases de datos existentes
                    if (fs.existsSync(dbPathData)) {
                        try {
                            fs.unlinkSync(dbPathData);
                            console.log(`Base de datos eliminada: ${dbPathData}`);
                        } catch (error) {
                            console.error(`Error al eliminar ${dbPathData}: ${error.message}`);
                        }
                    }
                    
                    if (fs.existsSync(dbPathRoot)) {
                        try {
                            fs.unlinkSync(dbPathRoot);
                            console.log(`Base de datos eliminada: ${dbPathRoot}`);
                        } catch (error) {
                            console.error(`Error al eliminar ${dbPathRoot}: ${error.message}`);
                        }
                    }
                    
                    // Crear nueva base de datos en data/prompts.db
                    const newDb = new sqlite3.Database(dbPathData, (err) => {
                        if (err) {
                            console.error(`Error al crear nueva base de datos: ${err.message}`);
                            process.exit(1);
                        }
                        
                        console.log('Nueva base de datos creada correctamente');
                        
                        // Crear tablas
                        newDb.serialize(() => {
                            newDb.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, salt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
                            newDb.run("CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT, slug TEXT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
                            newDb.run("CREATE TABLE IF NOT EXISTS prompts (id INTEGER PRIMARY KEY, image TEXT, prompt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
                            newDb.run("CREATE TABLE IF NOT EXISTS prompt_categories (id INTEGER PRIMARY KEY, prompt_id INTEGER, category_id INTEGER)");
                            
                            // Insertar usuarios
                            const insertUserStmt = newDb.prepare("INSERT INTO users (username, password, salt) VALUES (?, ?, ?)");
                            users.forEach(user => {
                                insertUserStmt.run(user.username, user.password, user.salt);
                            });
                            insertUserStmt.finalize();
                            console.log(`Insertados ${users.length} usuarios`);
                            
                            // Insertar categorías
                            const insertCategoryStmt = newDb.prepare("INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)");
                            categories.forEach(category => {
                                insertCategoryStmt.run(category.name, category.slug, category.description);
                            });
                            insertCategoryStmt.finalize();
                            console.log(`Insertadas ${categories.length} categorías`);
                            
                            // Insertar prompts
                            const insertPromptStmt = newDb.prepare("INSERT INTO prompts (id, image, prompt) VALUES (?, ?, ?)");
                            prompts.forEach(prompt => {
                                let imagePath = prompt.image;
                                
                                // Normalizar ruta de imagen
                                if (imagePath.startsWith('/images/')) {
                                    imagePath = imagePath.substring(8);
                                } else if (imagePath.startsWith('images/')) {
                                    imagePath = imagePath.substring(7);
                                }
                                
                                insertPromptStmt.run(prompt.id, imagePath, prompt.prompt);
                            });
                            insertPromptStmt.finalize();
                            console.log(`Insertados ${prompts.length} prompts`);
                            
                            // Insertar relaciones prompt-categoría
                            const insertRelationStmt = newDb.prepare("INSERT INTO prompt_categories (prompt_id, category_id) VALUES (?, ?)");
                            promptCategories.forEach(relation => {
                                insertRelationStmt.run(relation.prompt_id, relation.category_id);
                            });
                            insertRelationStmt.finalize();
                            console.log(`Insertadas ${promptCategories.length} relaciones prompt-categoría`);
                            
                            // Copiar la nueva base de datos a la raíz
                            newDb.close(() => {
                                try {
                                    fs.copyFileSync(dbPathData, dbPathRoot);
                                    console.log(`Base de datos copiada a ${dbPathRoot}`);
                                    
                                    console.log('\n=== RESTAURACIÓN COMPLETA ===');
                                    console.log('La base de datos ha sido restaurada exitosamente.');
                                    console.log('Se han creado copias en data/prompts.db y prompts.db (raíz).');
                                    console.log('\nPara completar el proceso:');
                                    console.log('1. Reinicia el servidor (Ctrl+C y node server.js)');
                                    console.log('2. Verifica que los prompts se muestran correctamente');
                                    console.log('3. Ejecuta fix_database.js para asegurar que las imágenes estén correctamente sincronizadas');
                                } catch (error) {
                                    console.error(`Error al copiar base de datos a la raíz: ${error.message}`);
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});
