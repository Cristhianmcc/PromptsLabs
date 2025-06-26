// Corrector de autenticación para la galería de prompts
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

console.log('===== REPARACIÓN DE AUTENTICACIÓN =====');

// Configuración
const dbPath = path.join(__dirname, 'data', 'prompts.db');
const username = 'admin';
const password = 'admin123';

// Verificar directorio data
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
    console.log('Directorio data/ creado');
}

// Abrir o crear la base de datos
console.log(`Conectando a la base de datos en ${dbPath}...`);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error(`Error al abrir base de datos: ${err.message}`);
    }
    
    console.log('Conexión establecida');
    
    // Comprobar si existe la tabla users
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", [], (err, row) => {
        if (err) {
            return console.error(`Error al verificar tabla: ${err.message}`);
        }
        
        const createTable = !row;
        
        if (createTable) {
            console.log('Tabla users no encontrada, creándola...');
            db.run(`CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    return console.error(`Error al crear tabla: ${err.message}`);
                }
                
                console.log('Tabla users creada');
                createAdmin();
            });
        } else {
            console.log('Tabla users encontrada');
            
            // Verificar si existe el usuario admin
            db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
                if (err) {
                    return console.error(`Error al verificar usuario: ${err.message}`);
                }
                
                if (!user) {
                    console.log('Usuario admin no encontrado, creándolo...');
                    createAdmin();
                } else {
                    console.log('Usuario admin encontrado, recreándolo...');
                    
                    // Eliminar usuario existente
                    db.run("DELETE FROM users WHERE username = ?", [username], (err) => {
                        if (err) {
                            return console.error(`Error al eliminar usuario: ${err.message}`);
                        }
                        
                        console.log('Usuario admin eliminado');
                        createAdmin();
                    });
                }
            });
        }
    });
});

function createAdmin() {
    // Crear nuevo salt y hash para la contraseña
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    
    // Insertar el nuevo usuario
    db.run("INSERT INTO users (username, password, salt) VALUES (?, ?, ?)", 
        [username, hash, salt], 
        function(err) {
            if (err) {
                return console.error(`Error al crear usuario: ${err.message}`);
            }
            
            console.log(`Usuario admin creado con ID ${this.lastID}`);
            console.log('Credenciales: admin / admin123');
            
            // Verificar sesión en la base de datos
            console.log('\nVerificando autenticación...');
            
            db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
                if (err || !user) {
                    console.error('Error al verificar usuario recién creado');
                    return closeDb();
                }
                
                const testHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
                
                if (testHash === user.password) {
                    console.log('ÉXITO: La autenticación funciona correctamente');
                    console.log('\n===== INSTRUCCIONES =====');
                    console.log('1. Reinicia el servidor: node server.js');
                    console.log('2. Navega a /login.html');
                    console.log('3. Inicia sesión con admin/admin123');
                    console.log('4. Ahora deberías poder agregar y editar prompts');
                    console.log('\nSi continúas con problemas, revisa los logs del servidor');
                } else {
                    console.error('ERROR: La verificación de contraseña ha fallado');
                }
                
                closeDb();
            });
        }
    );
}

function closeDb() {
    db.close((err) => {
        if (err) {
            return console.error(`Error al cerrar base de datos: ${err.message}`);
        }
        console.log('Base de datos cerrada');
    });
}
