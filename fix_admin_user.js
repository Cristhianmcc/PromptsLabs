/**
 * Script para restaurar o crear un usuario administrador en la base de datos
 */
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Ruta a la base de datos
const dbPath = path.join(__dirname, 'data', 'prompts.db');

// Verificar si la base de datos existe
if (!fs.existsSync(dbPath)) {
    console.error(`Error: La base de datos no existe en ${dbPath}`);
    console.log('Intentando buscar la base de datos en la ruta principal...');
    
    const rootDbPath = path.join(__dirname, 'prompts.db');
    
    if (fs.existsSync(rootDbPath)) {
        console.log(`Base de datos encontrada en ${rootDbPath}`);
        console.log('Usando esta base de datos en su lugar...');
        dbPath = rootDbPath;
    } else {
        console.error('Error: No se encontró ninguna base de datos.');
        process.exit(1);
    }
}

console.log(`Conectando a la base de datos en: ${dbPath}`);

// Conectar a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(`Error al conectar a la base de datos: ${err.message}`);
        process.exit(1);
    }
    
    console.log('Conexión exitosa a la base de datos SQLite.');
    
    // Verificar si la tabla users existe
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`, (err, table) => {
        if (err) {
            console.error(`Error al verificar la tabla users: ${err.message}`);
            db.close();
            process.exit(1);
        }
        
        if (!table) {
            console.log('La tabla users no existe. Creándola...');
            
            db.run(`CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error(`Error al crear tabla users: ${err.message}`);
                    db.close();
                    process.exit(1);
                }
                
                console.log('Tabla users creada exitosamente.');
                createAdminUser();
            });
        } else {
            console.log('La tabla users existe. Eliminando usuario admin existente si hay alguno...');
            
            // Eliminar cualquier usuario admin existente
            db.run(`DELETE FROM users WHERE username = 'admin'`, (err) => {
                if (err) {
                    console.error(`Error al eliminar usuario admin existente: ${err.message}`);
                    db.close();
                    process.exit(1);
                }
                
                console.log('Usuario admin eliminado (si existía).');
                createAdminUser();
            });
        }
    });
});

// Función para crear el usuario administrador
function createAdminUser() {
    console.log('Creando nuevo usuario administrador...');
    
    // Generar salt aleatorio
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Nombre de usuario y contraseña predeterminados
    const username = 'admin';
    const password = 'admin123';
    
    // Generar hash de la contraseña con el salt
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    
    // Insertar usuario en la base de datos
    db.run(`INSERT INTO users (username, password, salt) VALUES (?, ?, ?)`, 
        [username, hash, salt], 
        function(err) {
            if (err) {
                console.error(`Error al crear usuario administrador: ${err.message}`);
                db.close();
                process.exit(1);
            }
            
            console.log('¡Usuario administrador creado exitosamente!');
            console.log(`ID: ${this.lastID}`);
            console.log(`Usuario: ${username}`);
            console.log(`Contraseña: ${password}`);
            
            // Verificar que el usuario se haya creado correctamente
            db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
                if (err) {
                    console.error(`Error al verificar usuario creado: ${err.message}`);
                } else if (user) {
                    console.log('Verificación exitosa: el usuario existe en la base de datos.');
                    console.log(`Información del usuario: ID=${user.id}, Creado=${user.created_at}`);
                } else {
                    console.error('Error: El usuario no se encontró después de la creación.');
                }
                
                // Cerrar la conexión a la base de datos
                db.close();
                console.log('Operación completada. Base de datos cerrada.');
            });
        }
    );
}
