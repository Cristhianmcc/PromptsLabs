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

// Configurar session con opciones mejoradas y compatibles con Node.js v22+
const sessionOptions = {
    secret: 'prompt_gallery_secret_key',
    resave: true, 
    saveUninitialized: true,
    cookie: { 
        secure: false, // Mantener en false para que funcione en desarrollo (sin HTTPS)
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        httpOnly: true,
        sameSite: 'lax'
    },
    rolling: true,
    name: 'prompt_gallery_session'
};

// Compatibilidad con versiones modernas de Node.js
try {
    console.log('Configurando express-session con manejo de sesiones...');
    app.use(session(sessionOptions));
    console.log('express-session configurado correctamente');
} catch (error) {
    console.error('Error al configurar express-session:', error);
    // Intentar con opciones más básicas si hay error
    console.log('Intentando con configuración alternativa...');
    app.use(session({
        secret: 'prompt_gallery_secret_key',
        resave: true,
        saveUninitialized: true,
        cookie: { secure: false, maxAge: 86400000 }
    }));
}

// Configurar bodyParser para procesar datos JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar rutas de almacenamiento
// Siempre usar la base de datos en /data que contiene los prompts
const isProd = true; // Forzar el uso del directorio data
const dbPath = path.join(__dirname, 'data', 'prompts.db');
const uploadsDir = path.join(__dirname, 'data', 'images');

// Configurar rutas de acceso
console.log("Directorio de imágenes:", uploadsDir);

// Servir archivos estáticos y configurar rutas explícitamente
app.use(express.static(path.join(__dirname, '/')));

// Configurar múltiples rutas para servir imágenes
// 1. Primero buscar en data/images (donde están los datos reales)
app.use('/images', express.static(uploadsDir, {
  fallthrough: true
}));

// 2. Si no se encuentra, buscar en el directorio /images en la raíz
app.use('/images', express.static(path.join(__dirname, 'images'), {
  fallthrough: true
}));

// Importar helper de imágenes
const imageHelper = require('./image_helper');

// Middleware para manejar fallbacks de imágenes
app.get('/images/:imageName', (req, res) => {
  // Usar el helper para servir la imagen o el placeholder
  imageHelper.serveImage(res, req.params.imageName, {
    dataDir: uploadsDir,
    rootDir: path.join(__dirname, 'images')
  });
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
        
        // Crear tablas si no existen - asegurarse de que todas las tablas se creen antes de importar datos
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

            // Ahora que todas las tablas están creadas, verificar si hay datos en prompts
            // y cargar datos iniciales si es necesario
            db.get("SELECT COUNT(*) as count FROM prompts", [], (err, row) => {
                if (err) {
                    console.error('Error al contar registros de prompts', err.message);
                } else if (row.count === 0) {
                    // Importar datos iniciales si la tabla está vacía
                    importInitialData();
                } else {
                    console.log(`Base de datos ya contiene ${row.count} prompts. No se importarán datos de ejemplo.`);
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
    console.log('Utilizando db_init.js para inicializar la base de datos...');
    // En lugar de implementar la lógica aquí, redirigir al script externo db_init.js
    const { exec } = require('child_process');
    exec('node db_init.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al ejecutar db_init.js: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Errores en db_init.js: ${stderr}`);
            return;
        }
        console.log(`Resultado de db_init.js: ${stdout}`);
    });
}

// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
    console.log("Verificando autenticación...");
    console.log("Estado de sesión:", req.session ? {
        id: req.session.id,
        isAuth: req.session.isAuthenticated,
        username: req.session.username,
        cookie: req.session.cookie ? {
            expires: req.session.cookie.expires,
            maxAge: req.session.cookie.maxAge
        } : 'No cookie'
    } : 'No session');
    
    if (req.session && req.session.isAuthenticated) {
        console.log("Usuario autenticado:", req.session.username);
        
        // Renovar la sesión explícitamente para mantener al usuario conectado
        // Esto es crítico para evitar que la sesión expire durante operaciones largas
        req.session.touch();
        req.session.lastActivity = Date.now();
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // Reset a 7 días en cada petición
        
        return next();
    }
    
    // Intentar auto-autenticación para recuperar sesión (solo para propósitos de desarrollo)
    if (process.env.NODE_ENV !== 'production') {
        console.log("Intentando auto-autenticación para desarrollo");
        
        // Buscar usuario administrador
        db.get("SELECT * FROM users WHERE username = 'admin'", [], (err, user) => {
            if (!err && user) {
                req.session.isAuthenticated = true;
                req.session.username = 'admin';
                req.session.userId = user.id;
                req.session.lastActivity = Date.now();
                req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
                req.session.save((err) => {
                    if (err) {
                        console.error("Error al guardar sesión:", err);
                        return sendAuthError();
                    }
                    console.log("Auto-autenticación exitosa para desarrollo");
                    return next();
                });
            } else {
                return sendAuthError();
            }
        });
    } else {
        return sendAuthError();
    }
    
    function sendAuthError() {
        console.log("Usuario no autenticado, redirigiendo a login");
        res.status(401).json({ 
            success: false, 
            message: 'No autenticado. Inicia sesión primero.',
            redirect: '/login.html'
        });
    }
}

// API Routes para autenticación
app.get('/login', (req, res) => {
    // Si ya está autenticado, redirigir al panel de administración
    if (req.session.isAuthenticated) {
        return res.redirect('/admin.html');
    }
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos' });
    }
    console.log(`Intento de login: usuario=${username}`);
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error('Error al consultar usuario:', err.message);
            return res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
        if (!user) {
            console.error(`Login fallido: usuario "${username}" no encontrado`);
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        const hash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
        if (hash === user.password) {
            // Regenerar la sesión para evitar problemas de sesión antigua
            req.session.regenerate((err) => {
                if (err) {
                    console.error('Error al regenerar sesión:', err);
                    return res.status(500).json({ success: false, message: 'Error al crear sesión' });
                }
                req.session.isAuthenticated = true;
                req.session.username = username;
                req.session.userId = user.id;
                req.session.lastActivity = Date.now();
                // Configurar cookie de sesión
                if (!req.session.cookie) req.session.cookie = {};
                try {
                    req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
                } catch (e) {
                    console.error('Error al configurar cookie.maxAge:', e);
                }
                req.session.save((err) => {
                    if (err) {
                        console.error('Error al guardar sesión:', err);
                        return res.status(500).json({ success: false, message: 'Error al guardar sesión' });
                    }
                    console.log(`Login exitoso: usuario=${username}, sessionID=${req.session.id}`);
                    return res.json({ 
                        success: true, 
                        message: 'Inicio de sesión exitoso', 
                        redirect: '/admin.html',
                        username: username,
                        sessionId: req.session.id,
                        sessionExpires: req.session.cookie.expires
                    });
                });
            });
        } else {
            console.error(`Login fallido: contraseña incorrecta para usuario "${username}"`);
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
    });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err.message);
            return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
        }
        res.redirect('/');
    });
});

// Endpoint para restaurar/crear el usuario administrador
app.get('/api/auth-fix', (req, res) => {
    // Primero eliminar cualquier usuario admin existente
    db.run("DELETE FROM users WHERE username = 'admin'", (err) => {
        if (err) {
            console.error('Error al eliminar usuario administrador existente:', err.message);
            return res.status(500).json({ success: false, message: 'Error al restaurar usuario administrador' });
        }
        
        // Crear nuevo usuario admin
        const salt = crypto.randomBytes(16).toString('hex');
        const password = 'admin123';
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        
        db.run("INSERT INTO users (username, password, salt) VALUES (?, ?, ?)", 
            ['admin', hash, salt], 
            function(err) {
                if (err) {
                    console.error('Error al crear nuevo usuario administrador:', err.message);
                    return res.status(500).json({ success: false, message: 'Error al crear nuevo usuario administrador' });
                }
                
                console.log('Usuario administrador restaurado correctamente');
                return res.json({ 
                    success: true, 
                    message: 'Usuario administrador restaurado correctamente. Credenciales: admin / admin123' 
                });
            }
        );
    });
});

// Endpoint para verificar el estado de la sesión
app.get('/api/check-session', (req, res) => {
    console.log(`Verificando sesión: ID=${req.session?.id || 'No ID'}`);
    console.log(`Estado sesión:`, req.session ? {
        isAuth: req.session.isAuthenticated,
        username: req.session.username,
        lastActivity: req.session.lastActivity,
        cookie: req.session.cookie ? {
            maxAge: req.session.cookie.maxAge,
            expires: req.session.cookie.expires
        } : 'No cookie'
    } : 'No hay sesión');
    
    // Auto-renovar la sesión si está autenticado
    if (req.session && req.session.isAuthenticated) {
        // Actualizar explícitamente la sesión para evitar expiración
        req.session.lastActivity = Date.now();
        req.session.touch(); // Marcar como usada
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // Resetear a 7 días

        // Tocar la sesión y guardarla explícitamente
        req.session.save((err) => {
            if (err) {
                console.error('Error al guardar sesión durante verificación:', err);
                // Intentar continuar a pesar del error
            }
            
            // Devolver información de sesión activa
            res.json({ 
                isAuthenticated: true, 
                username: req.session.username,
                lastActivity: req.session.lastActivity,
                sessionId: req.session.id,
                cookieMaxAge: req.session.cookie.maxAge
            });
        });
    } else {
        // Intentar auto-autenticación para propósitos de desarrollo
        if (process.env.NODE_ENV !== 'production') {
            console.log('Auto-login para desarrollo activado');
            db.get("SELECT * FROM users WHERE username = 'admin'", [], (err, user) => {
                if (!err && user) {
                    // Para desarrollo, crear sesión automáticamente
                    // Limpiar la sesión actual primero
                    for (let key in req.session) {
                        if (key !== 'cookie') {
                            delete req.session[key];
                        }
                    }
                    
                    // Configurar la nueva sesión
                    req.session.isAuthenticated = true;
                    req.session.username = 'admin';
                    req.session.userId = user.id;
                    req.session.lastActivity = Date.now();
                    req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
                        
                        req.session.save((saveErr) => {
                            if (saveErr) {
                                console.error('Error al guardar sesión auto-creada:', saveErr);
                                return res.json({ isAuthenticated: false, error: 'Error al guardar sesión' });
                            }
                            console.log('Auto-autenticado con éxito para desarrollo');
                            return res.json({ 
                                isAuthenticated: true, 
                                username: 'admin', 
                                autoAuth: true,
                                sessionId: req.session.id,
                                cookieMaxAge: req.session.cookie.maxAge
                            });
                        });
                } else {
                    return res.json({ isAuthenticated: false });
                }
            });
        } else {
            return res.json({ isAuthenticated: false });
        }
    }
});

// API Routes para prompts
app.get('/api/prompts', (req, res) => {
    const category = req.query.category;
    
    let query = `
        SELECT p.id, p.image, p.prompt, p.created_at, GROUP_CONCAT(c.name) as categories
        FROM prompts p
        LEFT JOIN prompt_categories pc ON p.id = pc.prompt_id
        LEFT JOIN categories c ON pc.category_id = c.id
    `;
    
    const queryParams = [];
    
    if (category) {
        query += ` WHERE c.slug = ? OR c.name = ?`;
        queryParams.push(category, category);
    }
    
    query += ` GROUP BY p.id ORDER BY p.id DESC`;
    
    db.all(query, queryParams, (err, rows) => {
        if (err) {
            console.error('Error al obtener prompts:', err.message);
            return res.status(500).json({ success: false, message: 'Error al obtener prompts' });
        }
        
        // Procesar los resultados para convertir la cadena de categorías en un array
        const results = rows.map(row => {
            // Procesar la imagen para asegurarse de que tiene la ruta correcta
            return {
                id: row.id,
                image: imageHelper.normalizeImagePath(row.image),
                prompt: row.prompt,
                created_at: row.created_at,
                categories: row.categories ? row.categories.split(',') : []
            };
        });
        
        res.json(results);
    });
});

// Ruta para obtener un prompt específico por ID
app.get('/api/prompts/:id', (req, res) => {
    db.get(`
        SELECT p.id, p.image, p.prompt, p.created_at, GROUP_CONCAT(c.name) as categories
        FROM prompts p
        LEFT JOIN prompt_categories pc ON p.id = pc.prompt_id
        LEFT JOIN categories c ON pc.category_id = c.id
        WHERE p.id = ?
        GROUP BY p.id
    `, [req.params.id], (err, row) => {
        if (err) {
            console.error('Error al obtener prompt:', err.message);
            return res.status(500).json({ success: false, message: 'Error al obtener prompt' });
        }
        
        if (!row) {
            return res.status(404).json({ success: false, message: 'Prompt no encontrado' });
        }
        
        // Procesar el resultado
        const result = {
            id: row.id,
            image: imageHelper.normalizeImagePath(row.image),
            prompt: row.prompt,
            created_at: row.created_at,
            categories: row.categories ? row.categories.split(',') : []
        };
        
        res.json(result);
    });
});

// API Routes para obtener categorías
app.get('/api/categories', (req, res) => {
    db.all("SELECT id, name, slug, description FROM categories ORDER BY name", [], (err, rows) => {
        if (err) {
            console.error('Error al obtener categorías:', err.message);
            return res.status(500).json({ success: false, message: 'Error al obtener categorías' });
        }
        
        res.json(rows);
    });
});

// API Routes para administración (protegidas por autenticación)
app.post('/api/prompts', isAuthenticated, upload.single('image'), (req, res) => {
    console.log('===== RECIBIDA PETICIÓN PARA CREAR NUEVO PROMPT =====');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Archivo:', req.file);
    console.log('Sesión:', req.session);
    
    const { prompt, categories } = req.body;
    const imagePath = req.file ? req.file.filename : null;
    
    if (!prompt || !imagePath) {
        console.error('Faltan campos obligatorios:', { prompt: !!prompt, imagePath: !!imagePath });
        return res.status(400).json({ success: false, message: 'Prompt e imagen son requeridos' });
    }
    
    // Insertar prompt en la base de datos
    db.run("INSERT INTO prompts (image, prompt) VALUES (?, ?)", 
        [imagePath, prompt], 
        function(err) {
            if (err) {
                console.error('Error al insertar prompt:', err.message);
                return res.status(500).json({ success: false, message: 'Error al guardar prompt' });
            }
            
            const promptId = this.lastID;
            
            // Si hay categorías, relacionarlas con el prompt
            if (categories && categories.length > 0) {
                const categoriesArray = Array.isArray(categories) ? categories : [categories];
                
                // Primero asegurarse de que todas las categorías existen
                const insertCategoryPromises = categoriesArray.map(category => {
                    return new Promise((resolve, reject) => {
                        const slug = category.toLowerCase()
                            .replace(/\s+/g, '-')
                            .replace(/[^\w\-]+/g, '')
                            .replace(/\-\-+/g, '-');
                        
                        // Intentar insertar la categoría si no existe
                        db.run("INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)",
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
                
                Promise.all(insertCategoryPromises)
                    .then(() => {
                        // Ahora relacionar el prompt con las categorías
                        const relPromises = categoriesArray.map(category => {
                            return new Promise((resolve, reject) => {
                                db.run("INSERT INTO prompt_categories (prompt_id, category_id) VALUES (?, (SELECT id FROM categories WHERE name = ?))",
                                    [promptId, category],
                                    function(err) {
                                        if (err) {
                                            console.error(`Error al relacionar prompt ${promptId} con categoría ${category}:`, err.message);
                                            reject(err);
                                        } else {
                                            resolve();
                                        }
                                    }
                                );
                            });
                        });
                        
                        return Promise.all(relPromises);
                    })
                    .then(() => {
                        // Enviar respuesta con información completa del prompt creado
                        const result = {
                            success: true, 
                            message: 'Prompt guardado correctamente',
                            prompt: {
                                id: promptId,
                                prompt: prompt,
                                image: imageHelper.normalizeImagePath(imagePath),
                                categories: categoriesArray || [],
                                created_at: new Date().toISOString()
                            }
                        };
                        console.log('Enviando respuesta:', result);
                        res.json(result);
                    })
                    .catch(error => {
                        console.error('Error al procesar categorías:', error);
                        res.status(500).json({ success: false, message: 'Error al procesar categorías: ' + error.message });
                    });
            } else {
                // Enviar respuesta con información completa del prompt creado
                const result = {
                    success: true, 
                    message: 'Prompt guardado correctamente',
                    prompt: {
                        id: promptId,
                        prompt: prompt,
                        image: imageHelper.normalizeImagePath(imagePath),
                        categories: [],
                        created_at: new Date().toISOString()
                    }
                };
                console.log('Enviando respuesta:', result);
                res.json(result);
            }
        }
    );
});

app.delete('/api/prompts/:id', isAuthenticated, (req, res) => {
    const promptId = req.params.id;
    
    // Eliminar prompt (las relaciones se eliminarán en cascada)
    db.run("DELETE FROM prompts WHERE id = ?", [promptId], function(err) {
        if (err) {
            console.error('Error al eliminar prompt:', err.message);
            return res.status(500).json({ success: false, message: 'Error al eliminar prompt' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Prompt no encontrado' });
        }
        
        res.json({ success: true, message: 'Prompt eliminado correctamente' });
    });
});

// Endpoint para actualizar un prompt existente
app.put('/api/prompts/:id', isAuthenticated, upload.single('image'), (req, res) => {
    console.log('===== RECIBIDA PETICIÓN PARA ACTUALIZAR PROMPT =====');
    console.log('Params:', req.params);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Archivo:', req.file);
    console.log('Sesión:', req.session);
    
    const promptId = req.params.id;
    const { prompt, categories } = req.body;
    
    if (!prompt) {
        console.error('Falta el texto del prompt');
        return res.status(400).json({ success: false, message: 'El texto del prompt es requerido' });
    }
    
    // Verificar si se subió una nueva imagen
    if (req.file) {
        const imagePath = req.file.filename;
        console.log('Nueva imagen recibida:', imagePath);
        
        // Actualizar prompt con nueva imagen
        db.run("UPDATE prompts SET prompt = ?, image = ? WHERE id = ?", 
            [prompt, imagePath, promptId],
            function(err) {
                if (err) {
                    console.error('Error al actualizar prompt con nueva imagen:', err.message);
                    return res.status(500).json({ success: false, message: 'Error al actualizar prompt' });
                }
                
                handleCategories();
            }
        );
    } else {
        // Actualizar solo el texto del prompt
        db.run("UPDATE prompts SET prompt = ? WHERE id = ?", 
            [prompt, promptId],
            function(err) {
                if (err) {
                    console.error('Error al actualizar prompt (solo texto):', err.message);
                    return res.status(500).json({ success: false, message: 'Error al actualizar prompt' });
                }
                
                handleCategories();
            }
        );
    }
    
    // Función para actualizar las categorías del prompt
    function handleCategories() {
        // Primero, eliminar relaciones existentes
        db.run("DELETE FROM prompt_categories WHERE prompt_id = ?", [promptId], function(err) {
            if (err) {
                console.error('Error al eliminar categorías existentes:', err.message);
                return res.status(500).json({ success: false, message: 'Error al actualizar categorías' });
            }
            
            // Si no hay nuevas categorías, terminar
            if (!categories || !categories.length) {
                // Obtener información del prompt actualizado
                db.get("SELECT id, prompt, image, created_at FROM prompts WHERE id = ?", [promptId], (err, row) => {
                    if (err || !row) {
                        console.error('Error al obtener prompt actualizado:', err ? err.message : 'No se encontró el prompt');
                        return res.status(err ? 500 : 404).json({ 
                            success: false, 
                            message: err ? 'Error al obtener prompt actualizado' : 'Prompt no encontrado' 
                        });
                    }
                    
                    // Enviar respuesta con información completa del prompt actualizado
                    const result = {
                        success: true, 
                        message: 'Prompt actualizado correctamente',
                        prompt: {
                            id: row.id,
                            prompt: row.prompt,
                            image: row.image ? `/images/${row.image}` : null,
                            categories: [],
                            created_at: row.created_at
                        }
                    };
                    console.log('Enviando respuesta (sin categorías):', result);
                    res.json(result);
                });
                return;
            }
            
            // Procesar categorías nuevas
            const categoriesArray = Array.isArray(categories) ? categories : [categories];
            
            // Asegurarse de que todas las categorías existen
            const insertCategoryPromises = categoriesArray.map(category => {
                return new Promise((resolve, reject) => {
                    const slug = category.toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^\w\-]+/g, '')
                        .replace(/\-\-+/g, '-');
                    
                    db.run("INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)",
                        [category, slug, `Prompts de la categoría ${category}`],
                        err => {
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
            
            Promise.all(insertCategoryPromises)
                .then(() => {
                    // Crear nuevas relaciones
                    const relPromises = categoriesArray.map(category => {
                        return new Promise((resolve, reject) => {
                            db.run("INSERT INTO prompt_categories (prompt_id, category_id) VALUES (?, (SELECT id FROM categories WHERE name = ?))",
                                [promptId, category],
                                err => {
                                    if (err) {
                                        console.error(`Error al relacionar prompt ${promptId} con categoría ${category}:`, err.message);
                                        reject(err);
                                    } else {
                                        resolve();
                                    }
                                }
                            );
                        });
                    });
                    
                    return Promise.all(relPromises);
                })
                .then(() => {
                    // Obtener información del prompt actualizado
                    db.get("SELECT id, prompt, image, created_at FROM prompts WHERE id = ?", [promptId], (err, row) => {
                        if (err || !row) {
                            console.error('Error al obtener prompt actualizado:', err ? err.message : 'No se encontró el prompt');
                            return res.status(err ? 500 : 404).json({ 
                                success: false, 
                                message: err ? 'Error al obtener prompt actualizado' : 'Prompt no encontrado' 
                            });
                        }
                        
                        // Enviar respuesta con información completa del prompt actualizado
                        const result = {
                            success: true, 
                            message: 'Prompt actualizado correctamente',
                            prompt: {
                                id: row.id,
                                prompt: row.prompt,
                                image: row.image ? `/images/${row.image}` : null,
                                categories: categoriesArray,
                                created_at: row.created_at
                            }
                        };
                        console.log('Enviando respuesta:', result);
                        res.json(result);
                    });
                })
                .catch(error => {
                    console.error('Error al procesar categorías:', error);
                    res.status(500).json({ 
                        success: false, 
                        message: 'Error al procesar categorías: ' + error.message 
                    });
                });
        });
    }
});

// Endpoint para diagnóstico del servidor y base de datos
app.get('/api/diagnostics', (req, res) => {
    const diagnostics = {
        server: {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            environment: isProd ? 'production' : 'development'
        },
        database: {
            path: dbPath,
            exists: fs.existsSync(dbPath),
            size: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
        },
        uploads: {
            directory: uploadsDir,
            exists: fs.existsSync(uploadsDir),
            fileCount: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).length : 0
        },
        status: 'ok'
    };
    
    // Verificar si la base de datos está funcionando
    db.get("SELECT COUNT(*) as count FROM sqlite_master", [], (err, row) => {
        if (err) {
            diagnostics.database.status = 'error';
            diagnostics.database.error = err.message;
            diagnostics.status = 'error';
        } else {
            diagnostics.database.status = 'ok';
            diagnostics.database.tables = row.count;
            
            // Verificar tablas críticas
            const tables = ['prompts', 'categories', 'prompt_categories', 'users'];
            const tablePromises = tables.map(table => {
                return new Promise((resolve) => {
                    db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?", [table], (err, row) => {
                        if (err || !row || row.count === 0) {
                            resolve({ table, exists: false });
                        } else {
                            resolve({ table, exists: true });
                        }
                    });
                });
            });
            
            Promise.all(tablePromises)
                .then(results => {
                    diagnostics.database.tables = results;
                    
                    // Verificar contenido de las tablas
                    const countPromises = tables.map(table => {
                        return new Promise((resolve) => {
                            db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
                                if (err) {
                                    resolve({ table, count: null, error: err.message });
                                } else {
                                    resolve({ table, count: row.count });
                                }
                            });
                        });
                    });
                    
                    return Promise.all(countPromises);
                })
                .then(counts => {
                    diagnostics.database.counts = counts;
                    res.json(diagnostics);
                })
                .catch(error => {
                    diagnostics.error = error.message;
                    diagnostics.status = 'error';
                    res.json(diagnostics);
                });
        }
    });
});

// Iniciar el servidor con manejo de errores y puerto alternativo
function startServer(port) {
    return app.listen(port, () => {
        console.log(`Servidor ejecutándose en http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`El puerto ${port} ya está en uso.`);
            
            // Si el puerto actual es el predeterminado, intentar con otro puerto
            if (port === 3000) {
                const alternativePort = 3001;
                console.log(`Intentando con puerto alternativo: ${alternativePort}...`);
                startServer(alternativePort);
            } else {
                console.error(`También se intentó con un puerto alternativo pero sigue habiendo problemas.
Por favor intenta uno de los siguientes:
1. Ejecutar kill_port_3000.bat para liberar el puerto
2. Reiniciar el equipo
3. Usar un puerto diferente explícitamente: 'set PORT=4000 && node server.js'`);
            }
        } else {
            console.error(`Error al iniciar el servidor:`, err);
        }
    });
}

const server = startServer(PORT);
