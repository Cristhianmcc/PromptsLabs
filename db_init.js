/**
 * Script para inicializar la base de datos con datos de ejemplo
 * Este script es independiente y puede ejecutarse directamente con Node.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configurar ruta de la base de datos
const dbPath = path.join(__dirname, 'data', 'prompts.db');
const uploadsDir = path.join(__dirname, 'data', 'images');

// Asegurar que los directorios existan
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    console.log(`Directorio creado: ${path.dirname(dbPath)}`);
}

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Directorio de imágenes creado: ${uploadsDir}`);
}

// Conectar a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
        process.exit(1);
    }
    console.log(`Conectado a la base de datos SQLite en ${dbPath}`);
    
    // Crear tablas
    createTables()
        .then(() => {
            // Verificar si hay datos
            return checkData();
        })
        .then((hasData) => {
            if (hasData) {
                console.log('La base de datos ya contiene datos. No se importarán datos de ejemplo.');
                process.exit(0);
            } else {
                console.log('La base de datos está vacía. Importando datos de ejemplo...');
                return importDefaultData();
            }
        })
        .then(() => {
            console.log('Proceso completado exitosamente.');
            process.exit(0);
        })
        .catch(err => {
            console.error('Error durante la inicialización:', err);
            process.exit(1);
        });
});

/**
 * Crear las tablas necesarias
 */
function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Tabla de prompts
            db.run(`CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image TEXT NOT NULL,
                prompt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error al crear la tabla prompts:', err.message);
                    reject(err);
                    return;
                }
                console.log('Tabla prompts creada o ya existente');
            });
            
            // Tabla de categorías
            db.run(`CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error al crear la tabla categories:', err.message);
                    reject(err);
                    return;
                }
                console.log('Tabla categories creada o ya existente');
            });
            
            // Tabla de relación entre prompts y categorías
            db.run(`CREATE TABLE IF NOT EXISTS prompt_categories (
                prompt_id INTEGER,
                category_id INTEGER,
                PRIMARY KEY (prompt_id, category_id),
                FOREIGN KEY (prompt_id) REFERENCES prompts(id),
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )`, (err) => {
                if (err) {
                    console.error('Error al crear la tabla prompt_categories:', err.message);
                    reject(err);
                    return;
                }
                console.log('Tabla prompt_categories creada o ya existente');
            });
            
            // Tabla de usuarios
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error al crear la tabla users:', err.message);
                    reject(err);
                    return;
                }
                console.log('Tabla users creada o ya existente');
                
                // Crear usuario administrador
                createDefaultAdmin();
                resolve();
            });
        });
    });
}

/**
 * Verificar si ya hay datos en la base de datos
 */
function checkData() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM prompts", [], (err, row) => {
            if (err) {
                console.error('Error al contar registros de prompts:', err.message);
                reject(err);
                return;
            }
            
            resolve(row && row.count > 0);
        });
    });
}

/**
 * Importar datos de ejemplo desde defaultData.js
 */
function importDefaultData() {
    return new Promise((resolve, reject) => {
        try {
            // Cargar datos desde defaultData.js
            const defaultDataPath = path.join(__dirname, 'defaultData.js');
            let defaultPrompts;
            
            try {
                const defaultData = require(defaultDataPath);
                defaultPrompts = defaultData.defaultPrompts;
            } catch (err) {
                console.error('Error al cargar defaultData.js:', err.message);
                
                // Datos de ejemplo en caso de que defaultData.js no exista
                defaultPrompts = [
                    {
                        prompt: "Un paisaje futurista con ciudades flotantes y naves espaciales, estilo cyberpunk, colores neón, 8k ultra detallado",
                        image: "1.jpg",
                        categories: ["Paisajes", "Futurista"]
                    },
                    {
                        prompt: "Retrato artístico de una mujer joven con flores en el cabello, estilo acuarela, iluminación suave, look etéreo",
                        image: "2.jpg",
                        categories: ["Retratos", "Artístico"]
                    },
                    {
                        prompt: "Un dragón majestuoso volando sobre montañas nevadas, estilo fantasía épica, colores vibrantes, detalle realista",
                        image: "3.jpg",
                        categories: ["Fantasía", "Criaturas"]
                    }
                ];
            }
            
            if (!defaultPrompts || !Array.isArray(defaultPrompts) || defaultPrompts.length === 0) {
                reject(new Error('No se encontraron datos válidos en defaultData.js'));
                return;
            }
            
            console.log(`Cargando ${defaultPrompts.length} prompts...`);
            
            // Extraer categorías únicas
            const uniqueCategories = new Set();
            defaultPrompts.forEach(item => {
                if (item.categories && Array.isArray(item.categories)) {
                    item.categories.forEach(cat => uniqueCategories.add(cat.trim()));
                }
            });
            
            const categories = Array.from(uniqueCategories);
            console.log(`Categorías encontradas: ${categories.join(', ')}`);
            
            // Insertar categorías
            const insertCategories = () => {
                const promises = categories.map(category => {
                    return new Promise((resolve, reject) => {
                        const slug = category.toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^\w\-]+/g, '')
                            .replace(/\-\-+/g, '-');
                            
                        db.run(
                            "INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)",
                            [category, slug, `Prompts de la categoría ${category}`],
                            function(err) {
                                if (err) {
                                    console.error(`Error al insertar categoría ${category}:`, err.message);
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            }
                        );
                    });
                });
                
                return Promise.all(promises);
            };
            
            // Insertar prompts y sus relaciones con categorías
            const insertPrompts = () => {
                const promises = defaultPrompts.map(item => {
                    return new Promise((resolve, reject) => {
                        // Procesar la ruta de la imagen
                        const imagePath = item.image.startsWith('/images/') ? 
                            item.image.substring(8) : item.image;
                            
                        // Copiar imagen de images a data/images si existe
                        const srcImagePath = path.join(__dirname, 'images', imagePath);
                        const destImagePath = path.join(uploadsDir, imagePath);
                        
                        try {
                            if (fs.existsSync(srcImagePath)) {
                                fs.copyFileSync(srcImagePath, destImagePath);
                                console.log(`Imagen copiada: ${imagePath}`);
                            }
                        } catch (err) {
                            console.error(`Error al copiar imagen ${imagePath}:`, err.message);
                        }
                        
                        // Insertar prompt en la base de datos
                        db.run(
                            "INSERT INTO prompts (image, prompt) VALUES (?, ?)",
                            [imagePath, item.prompt],
                            function(err) {
                                if (err) {
                                    console.error('Error al insertar prompt:', err.message);
                                    reject(err);
                                    return;
                                }
                                
                                const promptId = this.lastID;
                                
                                // Si el prompt tiene categorías, crear las relaciones
                                if (item.categories && Array.isArray(item.categories) && item.categories.length > 0) {
                                    const categoryPromises = item.categories.map(category => {
                                        return new Promise((catResolve) => {
                                            db.get(
                                                "SELECT id FROM categories WHERE name = ?",
                                                [category.trim()],
                                                (err, row) => {
                                                    if (err || !row) {
                                                        console.error(`No se encontró la categoría ${category}:`, err?.message);
                                                        catResolve();
                                                        return;
                                                    }
                                                    
                                                    db.run(
                                                        "INSERT OR IGNORE INTO prompt_categories (prompt_id, category_id) VALUES (?, ?)",
                                                        [promptId, row.id],
                                                        (err) => {
                                                            if (err) {
                                                                console.error(`Error al relacionar prompt con categoría ${category}:`, err.message);
                                                            }
                                                            catResolve();
                                                        }
                                                    );
                                                }
                                            );
                                        });
                                    });
                                    
                                    Promise.all(categoryPromises)
                                        .then(() => resolve())
                                        .catch(err => reject(err));
                                } else {
                                    resolve();
                                }
                            }
                        );
                    });
                });
                
                return Promise.all(promises);
            };
            
            // Ejecutar las operaciones en secuencia
            insertCategories()
                .then(() => {
                    console.log('Categorías insertadas correctamente');
                    return insertPrompts();
                })
                .then(() => {
                    console.log('Prompts insertados correctamente');
                    resolve();
                })
                .catch(err => {
                    console.error('Error durante la importación:', err);
                    reject(err);
                });
                
        } catch (error) {
            console.error('Error general durante la importación:', error);
            reject(error);
        }
    });
}

/**
 * Crear usuario administrador por defecto
 */
function createDefaultAdmin() {
    // Verificar si ya existe un usuario admin
    db.get("SELECT COUNT(*) as count FROM users WHERE username = 'admin'", [], (err, row) => {
        if (err) {
            console.error('Error al verificar usuario admin:', err.message);
            return;
        }
        
        if (row && row.count > 0) {
            console.log('Usuario admin ya existe');
            return;
        }
        
        // Crear usuario admin
        const crypto = require('crypto');
        const username = 'admin';
        const password = 'admin123';
        const salt = 'default_salt';
        
        // Hash simple para facilitar la recuperación
        const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
        
        db.run(
            "INSERT INTO users (username, password, salt) VALUES (?, ?, ?)",
            [username, hash, salt],
            function(err) {
                if (err) {
                    console.error('Error al crear usuario admin:', err.message);
                } else {
                    console.log('Usuario admin creado correctamente');
                }
            }
        );
    });
}
