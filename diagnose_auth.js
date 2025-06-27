/**
 * Script para diagnosticar problemas con la autenticación y la base de datos de usuarios
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Rutas a las posibles bases de datos
const dbPaths = [
    path.join(__dirname, 'data', 'prompts.db'),
    path.join(__dirname, 'prompts.db')
];

// Encontrar la primera base de datos existente
let dbPath;
for (const path of dbPaths) {
    if (fs.existsSync(path)) {
        dbPath = path;
        console.log(`Base de datos encontrada en: ${dbPath}`);
        break;
    }
}

if (!dbPath) {
    console.error('Error: No se encontró ninguna base de datos.');
    process.exit(1);
}

// Conectar a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(`Error al conectar a la base de datos: ${err.message}`);
        process.exit(1);
    }
    
    console.log('Conexión exitosa a la base de datos SQLite.');
    
    // Comprobar que la tabla users existe
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`, (err, table) => {
        if (err) {
            console.error(`Error al verificar la tabla users: ${err.message}`);
            db.close();
            process.exit(1);
        }
        
        if (!table) {
            console.error('Error: La tabla users no existe en la base de datos.');
            console.log('Es necesario crear la tabla y el usuario administrador.');
            db.close();
            process.exit(1);
        }
        
        console.log('La tabla users existe. Verificando usuarios...');
        
        // Contar usuarios
        db.get(`SELECT COUNT(*) as count FROM users`, (err, result) => {
            if (err) {
                console.error(`Error al contar usuarios: ${err.message}`);
                db.close();
                process.exit(1);
            }
            
            console.log(`Total de usuarios en la base de datos: ${result.count}`);
            
            // Buscar usuario administrador
            db.get(`SELECT * FROM users WHERE username = 'admin'`, (err, admin) => {
                if (err) {
                    console.error(`Error al buscar usuario admin: ${err.message}`);
                    db.close();
                    process.exit(1);
                }
                
                if (!admin) {
                    console.error('Error: El usuario admin no existe en la base de datos.');
                    console.log('Es necesario crear el usuario administrador.');
                    createAdminUser();
                } else {
                    console.log('Usuario admin encontrado:');
                    console.log(`  ID: ${admin.id}`);
                    console.log(`  Usuario: ${admin.username}`);
                    console.log(`  Creado: ${admin.created_at}`);
                    
                    // Verificar la contraseña
                    const testPassword = 'admin123';
                    const hash = crypto.pbkdf2Sync(testPassword, admin.salt, 1000, 64, 'sha512').toString('hex');
                    
                    if (hash === admin.password) {
                        console.log('Verificación de contraseña: CORRECTA');
                        console.log('El usuario admin puede iniciar sesión con la contraseña por defecto.');
                    } else {
                        console.log('Verificación de contraseña: INCORRECTA');
                        console.log('La contraseña del usuario admin no es la predeterminada.');
                        console.log('Actualizando la contraseña a la predeterminada...');
                        
                        // Actualizar la contraseña
                        const newSalt = crypto.randomBytes(16).toString('hex');
                        const newHash = crypto.pbkdf2Sync(testPassword, newSalt, 1000, 64, 'sha512').toString('hex');
                        
                        db.run(`UPDATE users SET password = ?, salt = ? WHERE username = 'admin'`,
                            [newHash, newSalt],
                            function(err) {
                                if (err) {
                                    console.error(`Error al actualizar la contraseña: ${err.message}`);
                                } else {
                                    console.log('Contraseña actualizada correctamente.');
                                    console.log(`Usuario: admin`);
                                    console.log(`Contraseña: admin123`);
                                }
                                db.close();
                            }
                        );
                    }
                }
            });
        });
    });
});

// Función para crear el usuario administrador
function createAdminUser() {
    console.log('Creando usuario administrador...');
    
    const salt = crypto.randomBytes(16).toString('hex');
    const password = 'admin123';
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    
    db.run(`INSERT INTO users (username, password, salt) VALUES (?, ?, ?)`, 
        ['admin', hash, salt], 
        function(err) {
            if (err) {
                console.error(`Error al crear usuario administrador: ${err.message}`);
            } else {
                console.log('Usuario administrador creado exitosamente:');
                console.log(`  ID: ${this.lastID}`);
                console.log(`  Usuario: admin`);
                console.log(`  Contraseña: admin123`);
            }
            db.close();
        }
    );
}
