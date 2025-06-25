const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const crypto = require('crypto');

// Inicializar la aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar session
app.use(session({
    secret: 'prompt_gallery_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 3600000, // 1 hora
        httpOnly: true
    },
    name: 'prompt_gallery_session'
}));

// Configurar bodyParser para procesar datos JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar rutas de almacenamiento para desarrollo y producción
const isProd = process.env.NODE_ENV === 'production';
// En producción, usar directorios dentro de la carpeta del proyecto en lugar de la raíz
const dbPath = isProd ? path.join(__dirname, 'data', 'prompts.db') : './prompts.db';
const uploadsDir = isProd ? path.join(__dirname, 'data', 'images') : './images/';

// Asegurar que las rutas tengan el formato correcto para path.join
const cleanUploadsDir = uploadsDir.replace(/^\.\/|^\//, '');

console.log("Directorio de imágenes:", path.join(__dirname, cleanUploadsDir));

// Servir archivos estáticos y configurar rutas explícitamente
app.use(express.static(path.join(__dirname, '/')));

// Ruta específica para servir imágenes desde el directorio de uploads
app.use('/images', express.static(path.join(__dirname, cleanUploadsDir), {
  fallthrough: true // Permite continuar a las siguientes rutas si el archivo no se encuentra
}));

// Middleware para manejar fallbacks de imágenes
app.get('/images/:imageName', (req, res) => {
  // Si llegamos aquí, significa que la imagen solicitada no existe
  console.log(`Imagen no encontrada: ${req.params.imageName}, sirviendo placeholder`);
  res.sendFile(path.join(__dirname, cleanUploadsDir, 'placeholder.jpg'));
});

// Rutas explícitas para archivos HTML para mayor claridad
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Asegurar que el directorio de imágenes exista
try {
    // Primero, asegurar que el directorio data exista si estamos en producción
    if (isProd && !fs.existsSync(path.join(__dirname, 'data'))) {
        fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
        console.log('Directorio data creado correctamente');
    }
    
    // Luego crear el directorio de imágenes si no existe
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`Directorio de imágenes ${uploadsDir} creado correctamente`);
    }
} catch (error) {
    console.error(`Error al crear directorios: ${error.message}`);
    // No detener la aplicación, seguir adelante aunque no se puedan crear los directorios
}

// Configurar multer para la carga de imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'));
        }
    }
});

// Conectar a la base de datos SQLite
// Asegurar que el directorio de la base de datos exista
try {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Directorio para la base de datos ${dbDir} creado correctamente`);
    }
} catch (error) {
    console.error(`Error al crear directorio para la base de datos: ${error.message}`);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos', err.message);
        // En producción, intentar usar SQLite en memoria si falla la conexión al archivo
        if (isProd) {
            console.log('Intentando usar SQLite en memoria...');
            return new sqlite3.Database(':memory:');
        }
    } else {
        console.log(`Conectado a la base de datos SQLite en ${dbPath}`);
        
        // Crear tablas si no existen
        db.serialize(() => {
            // Tabla de prompts
            db.run(`CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image TEXT NOT NULL,
                prompt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error al crear la tabla prompts', err.message);
                } else {
                    console.log('Tabla prompts creada o ya existente');
                    // Verificar si hay datos en la tabla
                    db.get("SELECT COUNT(*) as count FROM prompts", [], (err, row) => {
                        if (err) {
                            console.error('Error al contar registros', err.message);
                        } else if (row.count === 0) {
                            // Importar datos iniciales si la tabla está vacía
                            importInitialData();
                        }
                    });
                }
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
                    console.error('Error al crear la tabla categories', err.message);
                } else {
                    console.log('Tabla categories creada o ya existente');
                }
            });
            
            // Tabla de relación entre prompts y categorías
            db.run(`CREATE TABLE IF NOT EXISTS prompt_categories (
                prompt_id INTEGER,
                category_id INTEGER,
                PRIMARY KEY (prompt_id, category_id),
                FOREIGN KEY (prompt_id) REFERENCES prompts (id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error al crear la tabla prompt_categories', err.message);
                } else {
                    console.log('Tabla prompt_categories creada o ya existente');
                }
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
                    console.error('Error al crear la tabla users', err.message);
                } else {
                    console.log('Tabla users creada o ya existente');
                    // Verificar si hay usuarios en la tabla
                    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
                        if (err) {
                            console.error('Error al contar usuarios', err.message);
                        } else if (row.count === 0) {
                            // Crear usuario administrador por defecto
                            createDefaultAdmin();
                        }
                    });
                }
            });
        });
    }
});

// Función para crear usuario administrador por defecto
function createDefaultAdmin() {
    // Generar salt aleatorio
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Nombre de usuario y contraseña predeterminados
    const username = 'admin';
    const password = 'admin123'; // Deberías cambiar esto después
    
    // Generar hash de la contraseña con el salt
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    
    // Insertar usuario en la base de datos
    db.run("INSERT INTO users (username, password, salt) VALUES (?, ?, ?)", 
        [username, hash, salt], 
        function(err) {
            if (err) {
                console.error('Error al crear usuario administrador', err.message);
            } else {
                console.log('Usuario administrador creado correctamente');
            }
        }
    );
}

// Función para importar datos iniciales desde el archivo JS
function importInitialData() {
    try {
        // Intentar cargar los datos desde defaultData.js
        const { defaultPrompts } = require('./defaultData');
        
        if (defaultPrompts && Array.isArray(defaultPrompts) && defaultPrompts.length > 0) {
            console.log(`Cargando ${defaultPrompts.length} prompts desde defaultData.js`);
            
            // Crear un conjunto de categorías únicas
            const uniqueCategories = new Set();
            defaultPrompts.forEach(item => {
                if (item.categories && Array.isArray(item.categories)) {
                    item.categories.forEach(cat => uniqueCategories.add(cat.trim()));
                }
            });
            
            // Insertar categorías en la tabla de categorías
            const categoryInsertStmt = db.prepare("INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)");
            uniqueCategories.forEach(category => {
                const slug = category.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w\-]+/g, '')
                    .replace(/\-\-+/g, '-');
                categoryInsertStmt.run(category, slug, `Prompts de la categoría ${category}`);
            });
            categoryInsertStmt.finalize();
            
            // Insertar prompts y sus relaciones con categorías
            db.serialize(() => {
                // Insertar cada prompt
                defaultPrompts.forEach(item => {
                    // Asegurarse de que las rutas de imágenes sean correctas (sin /image/ al inicio)
                    const imagePath = item.image.startsWith('/images/') ? 
                        item.image.substring(8) : // Quitar '/images/' del inicio
                        item.image;
                    
                    db.run("INSERT INTO prompts (image, prompt) VALUES (?, ?)", 
                        [imagePath, item.prompt], 
                        function(err) {
                            if (err) {
                                console.error('Error al insertar prompt:', err.message);
                                return;
                            }
                            
                            const promptId = this.lastID;
                            
                            // Si el prompt tiene categorías, crear las relaciones
                            if (item.categories && Array.isArray(item.categories)) {
                                const relStmt = db.prepare("INSERT INTO prompt_categories (prompt_id, category_id) VALUES (?, (SELECT id FROM categories WHERE name = ?))");
                                
                                item.categories.forEach(category => {
                                    relStmt.run(promptId, category.trim(), err => {
                                        if (err) console.error(`Error al relacionar prompt ${promptId} con categoría ${category}:`, err.message);
                                    });
                                });
                                
                                relStmt.finalize();
                            }
                        }
                    );
                });
            });
            
            console.log('Datos iniciales importados correctamente desde defaultData.js');
        } else {
            console.error('No se encontraron prompts válidos en defaultData.js');
        }
    } catch (error) {
        console.error('Error al importar datos iniciales:', error);
        console.log('Intentando usar método alternativo (scripts.js)...');
        
        // Método alternativo: intentar extraer los datos de scripts.js
        try {
            // Leer el archivo scripts.js
            const scriptPath = path.join(__dirname, 'scripts.js');
            let scriptContent = fs.readFileSync(scriptPath, 'utf8');
            
            // Extraer el array promptsData usando una expresión regular
            const promptsDataMatch = scriptContent.match(/const\s+promptsData\s*=\s*\[([\s\S]*?)\];/);
            
            if (promptsDataMatch && promptsDataMatch[1]) {
                // Convertir el texto del array a formato JSON para poder procesarlo
                const jsonStr = '[' + promptsDataMatch[1] + ']';
                // Limpiar el texto para hacerlo compatible con JSON
                const cleanedJsonStr = jsonStr
                    .replace(/(\s*{\s*)/g, '{')
                    .replace(/(\s*}\s*),/g, '},')
                    .replace(/image:\s*"([^"]+)"/g, '"image":"$1"')
                    .replace(/prompt:\s*"([^"]+)"/g, '"prompt":"$1"')
                    .replace(/categories:\s*\[(.*?)\]/g, function(match, p1) {
                        // Convertir el array de categorías a formato JSON
                        const categoriesJson = p1.split(',')
                            .map(cat => `"${cat.trim().replace(/"/g, '')}"`)
                            .join(',');
                        return `"categories":[${categoriesJson}]`;
                    });
                
                try {
                    const promptsData = JSON.parse(cleanedJsonStr);
                      
                    // Crear un conjunto de categorías únicas
                    const uniqueCategories = new Set();
                    promptsData.forEach(item => {
                        if (item.categories && Array.isArray(item.categories)) {
                            item.categories.forEach(cat => uniqueCategories.add(cat.trim()));
                        }
                    });
                    
                    // Insertar categorías en la tabla de categorías
                    const categoryInsertStmt = db.prepare("INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)");
                    uniqueCategories.forEach(category => {
                        const slug = category.toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^\w\-]+/g, '')
                            .replace(/\-\-+/g, '-');
                        categoryInsertStmt.run(category, slug, `Prompts de la categoría ${category}`);
                    });
                    categoryInsertStmt.finalize();
                    
                    // Insertar prompts y sus relaciones con categorías
                    db.serialize(() => {
                        // Insertar cada prompt
                        promptsData.forEach(item => {
                            // Asegurarse de que las rutas de imágenes sean correctas (sin /image/ al inicio)
                            const imagePath = item.image.startsWith('/images/') ? 
                                item.image.substring(8) : // Quitar '/images/' del inicio
                                item.image;
                            
                            db.run("INSERT INTO prompts (image, prompt) VALUES (?, ?)", 
                                [imagePath, item.prompt], 
                                function(err) {
                                    if (err) {
                                        console.error('Error al insertar prompt:', err.message);
                                        return;
                                    }
                                    
                                    const promptId = this.lastID;
                                    
                                    // Si el prompt tiene categorías, crear las relaciones
                                    if (item.categories && Array.isArray(item.categories)) {
                                        const relStmt = db.prepare("INSERT INTO prompt_categories (prompt_id, category_id) VALUES (?, (SELECT id FROM categories WHERE name = ?))");
                                        
                                        item.categories.forEach(category => {
                                            relStmt.run(promptId, category.trim(), err => {
                                                if (err) console.error(`Error al relacionar prompt ${promptId} con categoría ${category}:`, err.message);
                                            });
                                        });
                                        
                                        relStmt.finalize();
                                    }
                                }
                            );
                        });
                    });
                    
                    console.log('Datos iniciales importados correctamente desde scripts.js');
                } catch (jsonError) {
                    console.error('Error al parsear JSON', jsonError);
                }
            } else {
                console.error('No se pudo encontrar el array promptsData en scripts.js');
            }
        } catch (fileError) {
            console.error('Error al leer el archivo scripts.js', fileError);
        }
    }
}

// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/login.html');
}

// API Routes para autenticación
app.get('/login', (req, res) => {
    // Si ya está autenticado, redirigir al panel de administración
    if (req.session.isAuthenticated) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Asegurarse de que /login.html también funcione
app.get('/login.html', (req, res) => {
    // Si ya está autenticado, redirigir al panel de administración
    if (req.session.isAuthenticated) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "Se requiere nombre de usuario y contraseña" });
    }
    
    // Buscar usuario en la base de datos
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }
        
        // Verificar contraseña
        const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
        
        if (hash !== user.password) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }
        
        // Autenticar usuario
        req.session.isAuthenticated = true;
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, redirect: '/admin' });
    });
});

app.get('/api/logout', (req, res) => {
    // Destruir la sesión
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({ error: err.message });
        }
        
        // Redirigir a la página de inicio de sesión
        return res.redirect('/login.html');
    });
});

// También crear una ruta más simple para el logout
app.get('/logout', (req, res) => {
    // Destruir la sesión
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
        }
        // Redirigir a la página de inicio de sesión
        res.redirect('/login.html');
    });
});

// API Routes

// Obtener todos los prompts
app.get('/api/prompts', (req, res) => {
    console.log('Solicitud recibida para obtener prompts');
    // Obtener todos los prompts
    db.all("SELECT * FROM prompts ORDER BY id DESC", [], (err, prompts) => {
        if (err) {
            console.error('Error al obtener prompts:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Obtener las categorías para cada prompt
        const promptIds = prompts.map(p => p.id);
        
        if (promptIds.length === 0) {
            console.log('No se encontraron prompts');
            res.json([]);
            return;
        }
        
        const placeholders = promptIds.map(() => '?').join(',');
        
        db.all(`
            SELECT pc.prompt_id, c.name as category_name 
            FROM prompt_categories pc
            JOIN categories c ON pc.category_id = c.id
            WHERE pc.prompt_id IN (${placeholders})
        `, promptIds, (err, categoriesRows) => {
            if (err) {
                console.error('Error al obtener categorías:', err.message);
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Agrupar categorías por prompt_id
            const categoriesByPromptId = {};
            categoriesRows.forEach(row => {
                if (!categoriesByPromptId[row.prompt_id]) {
                    categoriesByPromptId[row.prompt_id] = [];
                }
                categoriesByPromptId[row.prompt_id].push(row.category_name);
            });
              // Añadir categorías a cada prompt
            const promptsWithCategories = prompts.map(prompt => {
                // Asegurar que la ruta de la imagen sea correcta
                let imagePath = prompt.image;
                
                // Normalizar la ruta de la imagen
                if (imagePath) {
                    // Si no comienza con 'images/', añadirlo
                    if (!imagePath.startsWith('images/') && !imagePath.startsWith('/images/')) {
                        imagePath = 'images/' + imagePath;
                    }
                    
                    // Asegurarse de que no hay barras duplicadas
                    imagePath = imagePath.replace(/\/+/g, '/');
                    
                    // Si comienza con una barra, quitarla
                    if (imagePath.startsWith('/')) {
                        imagePath = imagePath.substring(1);
                    }
                } else {
                    // Si no hay imagen, usar un placeholder
                    imagePath = 'images/placeholder.jpg';
                }
                
                return {
                    ...prompt,
                    image: imagePath,
                    categories: categoriesByPromptId[prompt.id] || []
                };
            });
            
            console.log(`Se encontraron ${promptsWithCategories.length} prompts con sus categorías`);
            res.json(promptsWithCategories);
        });
    });
});

// Obtener un prompt específico
app.get('/api/prompts/:id', (req, res) => {
    db.get("SELECT * FROM prompts WHERE id = ?", [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: "Prompt no encontrado" });
            return;
        }
        res.json(row);
    });
});

// Crear un nuevo prompt
app.post('/api/prompts', isAuthenticated, upload.single('image'), (req, res) => {
    const { prompt } = req.body;
    const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    if (!prompt || !imagePath) {
        res.status(400).json({ error: "Se requiere un prompt y una imagen" });
        return;
    }

    db.run("INSERT INTO prompts (image, prompt) VALUES (?, ?)", 
        [imagePath, prompt], 
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({
                id: this.lastID,
                image: imagePath,
                prompt: prompt
            });
        }
    );
});

// Actualizar un prompt
app.put('/api/prompts/:id', isAuthenticated, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { prompt } = req.body;
    
    // Si hay una nueva imagen
    if (req.file) {
        const imagePath = req.file.path.replace(/\\/g, '/');
        
        // Obtener la imagen anterior para eliminarla
        db.get("SELECT image FROM prompts WHERE id = ?", [id], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (!row) {
                res.status(404).json({ error: "Prompt no encontrado" });
                return;
            }
            
            // Actualizar con la nueva imagen
            db.run("UPDATE prompts SET image = ?, prompt = ? WHERE id = ?", 
                [imagePath, prompt, id], 
                function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    if (this.changes === 0) {
                        res.status(404).json({ error: "Prompt no encontrado" });
                        return;
                    }
                    
                    // Eliminar la imagen anterior si no es una de las imágenes por defecto
                    try {
                        const oldImage = row.image;
                        if (!oldImage.includes('botella.jpg') && !oldImage.match(/\/\d+\.jpg$/)) {
                            fs.unlinkSync(oldImage);
                        }
                    } catch (unlinkErr) {
                        console.error('Error al eliminar imagen anterior:', unlinkErr);
                    }
                    
                    res.json({ id, image: imagePath, prompt });
                }
            );
        });
    } else {
        // Solo actualizar el prompt sin cambiar la imagen
        db.run("UPDATE prompts SET prompt = ? WHERE id = ?", 
            [prompt, id], 
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                if (this.changes === 0) {
                    res.status(404).json({ error: "Prompt no encontrado" });
                    return;
                }
                
                res.json({ id, prompt });
            }
        );
    }
});

// Eliminar un prompt
app.delete('/api/prompts/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    
    // Obtener la imagen para eliminarla del sistema de archivos
    db.get("SELECT image FROM prompts WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: "Prompt no encontrado" });
            return;
        }
        
        // Eliminar de la base de datos
        db.run("DELETE FROM prompts WHERE id = ?", [id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (this.changes === 0) {
                res.status(404).json({ error: "Prompt no encontrado" });
                return;
            }
            
            // Eliminar la imagen si no es una de las imágenes por defecto
            try {
                const imagePath = row.image;
                if (!imagePath.includes('botella.jpg') && !imagePath.match(/\/\d+\.jpg$/)) {
                    fs.unlinkSync(imagePath);
                }
            } catch (unlinkErr) {
                console.error('Error al eliminar imagen:', unlinkErr);
            }
            
            res.json({ message: "Prompt eliminado" });
        });
    });
});

// Rutas para el panel de administración
app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Cambiar contraseña
app.post('/api/change-password', isAuthenticated, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Se requiere la contraseña actual y la nueva" });
    }
    
    // Buscar usuario en la base de datos
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        
        // Verificar contraseña actual
        const currentHash = crypto.pbkdf2Sync(currentPassword, user.salt, 1000, 64, 'sha512').toString('hex');
        
        if (currentHash !== user.password) {
            return res.status(401).json({ error: "Contraseña actual incorrecta" });
        }
        
        // Generar nuevo hash para la nueva contraseña
        const newHash = crypto.pbkdf2Sync(newPassword, user.salt, 1000, 64, 'sha512').toString('hex');
        
        // Actualizar contraseña en la base de datos
        db.run("UPDATE users SET password = ? WHERE id = ?", [newHash, userId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: "No se pudo actualizar la contraseña" });
            }
            
            res.json({ success: true, message: "Contraseña actualizada correctamente" });
        });
    });
});

// Obtener todas las categorías
app.get('/api/categories', (req, res) => {
    console.log('Solicitud recibida para obtener categorías');
    db.all("SELECT * FROM categories ORDER BY name ASC", [], (err, rows) => {
        if (err) {
            console.error('Error al obtener categorías:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(`Se encontraron ${rows.length} categorías`);
        res.json(rows);
    });
});

// Función para actualizar los prompts existentes con categorías
app.get('/api/admin/update-categories', (req, res) => {
    // Verificar autenticación
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    console.log('Iniciando actualización de categorías...');
    
    // 1. Extraer categorías únicas de todos los prompts
    db.all("SELECT id, prompt FROM prompts", [], (err, prompts) => {
        if (err) {
            console.error('Error al obtener prompts:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        // Categorías comunes que podrían encontrarse en los prompts
        const commonCategories = [
            {keyword: 'paisaje', category: 'Paisajes'},
            {keyword: 'retrato', category: 'Retratos'},
            {keyword: 'fantasy', category: 'Fantasía'},
            {keyword: 'fantasia', category: 'Fantasía'},
            {keyword: 'character', category: 'Personajes'},
            {keyword: 'personaje', category: 'Personajes'},
            {keyword: 'sci-fi', category: 'Ciencia Ficción'},
            {keyword: 'ciencia ficcion', category: 'Ciencia Ficción'},
            {keyword: 'abstract', category: 'Abstracto'},
            {keyword: 'abstracto', category: 'Abstracto'},
            {keyword: 'animal', category: 'Animales'},
            {keyword: 'arquitectura', category: 'Arquitectura'},
            {keyword: 'arte digital', category: 'Arte Digital'},
            {keyword: 'cyberpunk', category: 'Cyberpunk'},
            {keyword: 'medieval', category: 'Medieval'},
            {keyword: 'futurista', category: 'Futurista'},
            {keyword: 'realista', category: 'Fotorrealismo'}
        ];
        
        // Asegurar que todas las categorías comunes estén en la base de datos
        const insertCategoryStmt = db.prepare("INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)");
        commonCategories.forEach(({category}) => {
            const slug = category.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-');
            insertCategoryStmt.run(category, slug, `Prompts de ${category}`);
        });
        insertCategoryStmt.finalize();
        
        // 2. Asignar categorías a los prompts basadas en palabras clave
        let updatedCount = 0;
        let totalPrompts = prompts.length;
        let processedPrompts = 0;
        
        prompts.forEach(prompt => {
            const promptText = prompt.prompt.toLowerCase();
            const matchedCategories = new Set();
            
            // Buscar palabras clave en el texto del prompt
            commonCategories.forEach(({keyword, category}) => {
                if (promptText.includes(keyword.toLowerCase())) {
                    matchedCategories.add(category);
                }
            });
            
            // Si no se encontraron categorías, añadir "General"
            if (matchedCategories.size === 0) {
                matchedCategories.add("General");
            }
            
            // Añadir entradas a la tabla de relaciones
            db.get("SELECT id FROM categories WHERE name = ?", ["General"], (err, generalCategory) => {
                if (err) {
                    console.error('Error al buscar categoría General:', err.message);
                    return;
                }
                
                // Si no existe la categoría General, crearla
                if (!generalCategory) {
                    db.run("INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)", 
                           ["General", "general", "Prompts generales"], function(err) {
                        if (err) {
                            console.error('Error al crear categoría General:', err.message);
                            return;
                        }
                        // Usar el ID de la categoría recién creada
                        processCategories(prompt.id, matchedCategories, this.lastID);
                    });
                } else {
                    // Usar el ID de la categoría General existente
                    processCategories(prompt.id, matchedCategories, generalCategory.id);
                }
            });
        });
        
        function processCategories(promptId, categories, generalCategoryId) {
            // Eliminar relaciones existentes para este prompt
            db.run("DELETE FROM prompt_categories WHERE prompt_id = ?", [promptId], (err) => {
                if (err) {
                    console.error(`Error al eliminar relaciones para prompt ${promptId}:`, err.message);
                    processedPrompts++;
                    return;
                }
                
                // Añadir nuevas relaciones
                const insertRelationStmt = db.prepare("INSERT INTO prompt_categories (prompt_id, category_id) VALUES (?, (SELECT id FROM categories WHERE name = ?))");
                
                categories.forEach(category => {
                    insertRelationStmt.run(promptId, category, err => {
                        if (err) {
                            console.error(`Error al relacionar prompt ${promptId} con categoría ${category}:`, err.message);
                        }
                    });
                });
                
                insertRelationStmt.finalize();
                updatedCount++;
                processedPrompts++;
                
                // Cuando todos los prompts han sido procesados, responder
                if (processedPrompts === totalPrompts) {
                    console.log(`Actualización completada. ${updatedCount} prompts actualizados con categorías.`);
                    res.json({ 
                        success: true, 
                        message: `${updatedCount} de ${totalPrompts} prompts fueron actualizados con categorías.` 
                    });
                }
            });
        }
    });
});

// Endpoint de diagnóstico - solo accesible en modo desarrollo o con autenticación
app.get('/api/diagnostics', (req, res) => {
    // En producción, requerir autenticación
    if (isProd && !req.session.isAuthenticated) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    const diagnostics = {
        environment: isProd ? 'production' : 'development',
        timestamp: new Date().toISOString(),
        dbPath: dbPath,
        uploadsDir: uploadsDir,
        dbExists: false,
        imagesDir: {
            exists: false,
            readable: false,
            writable: false,
            files: []
        },
        dbStats: {
            promptCount: 0,
            categoryCount: 0
        }
    };
    
    // Verificar si la base de datos existe
    try {
        diagnostics.dbExists = fs.existsSync(dbPath);
    } catch (error) {
        diagnostics.dbError = error.message;
    }
    
    // Verificar directorio de imágenes
    try {
        const imagesDirExists = fs.existsSync(uploadsDir);
        diagnostics.imagesDir.exists = imagesDirExists;
        
        if (imagesDirExists) {
            try {
                // Verificar permisos
                fs.accessSync(uploadsDir, fs.constants.R_OK);
                diagnostics.imagesDir.readable = true;
            } catch (e) {
                diagnostics.imagesDir.readable = false;
            }
            
            try {
                fs.accessSync(uploadsDir, fs.constants.W_OK);
                diagnostics.imagesDir.writable = true;
            } catch (e) {
                diagnostics.imagesDir.writable = false;
            }
            
            // Listar archivos
            try {
                const files = fs.readdirSync(uploadsDir);
                diagnostics.imagesDir.files = files.slice(0, 20); // Limitar a 20 archivos para no sobrecargar
                diagnostics.imagesDir.totalFiles = files.length;
            } catch (e) {
                diagnostics.imagesDir.fileListError = e.message;
            }
        }
    } catch (error) {
        diagnostics.imagesDir.error = error.message;
    }
    
    // Verificar estado de la base de datos
    if (diagnostics.dbExists) {
        db.get("SELECT COUNT(*) as count FROM prompts", [], (err, row) => {
            if (err) {
                diagnostics.dbStats.promptError = err.message;
                return res.json(diagnostics);
            }
            
            diagnostics.dbStats.promptCount = row ? row.count : 0;
            
            db.get("SELECT COUNT(*) as count FROM categories", [], (err, row) => {
                if (err) {
                    diagnostics.dbStats.categoryError = err.message;
                    return res.json(diagnostics);
                }
                
                diagnostics.dbStats.categoryCount = row ? row.count : 0;
                res.json(diagnostics);
            });
        });
    } else {
        res.json(diagnostics);
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Cerrar la conexión a la base de datos cuando la aplicación termina
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Conexión a la base de datos cerrada');
        process.exit(0);
    });
});
