/**
 * Configuración mejorada para express-session
 * Este archivo proporciona una configuración compatible con versiones más nuevas de Node.js
 */

const session = require('express-session');

// Configuración de session compatible con Node.js v22+
function configureSession(app) {
    // Configuración de sesión
    app.use(session({
        secret: 'prompt_gallery_secret_key',
        resave: true,
        saveUninitialized: true,
        cookie: { 
            secure: false, 
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
            httpOnly: true,
            sameSite: 'lax'
        },
        rolling: true,
        name: 'prompt_gallery_session'
    }));

    // Middleware para renovar la sesión en cada petición
    app.use((req, res, next) => {
        // Si hay una sesión autenticada, renovar su tiempo de expiración
        if (req.session && req.session.isAuthenticated) {
            req.session.lastActivity = Date.now();
            if (req.session.cookie) {
                req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
            }
        }
        next();
    });

    console.log('Configuración de sesión mejorada aplicada');
}

/**
 * Helper para iniciar sesión sin usar regenerate
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} user - Objeto de usuario con ID y nombre de usuario
 */
function loginUser(req, user) {
    // Limpiar cualquier dato de sesión anterior
    for (let key in req.session) {
        if (key !== 'cookie') {
            delete req.session[key];
        }
    }
    
    // Establecer datos de autenticación
    req.session.isAuthenticated = true;
    req.session.username = user.username;
    req.session.userId = user.id;
    req.session.lastActivity = Date.now();
    
    // Asegurar que la cookie tiene una duración larga
    if (req.session.cookie) {
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días
    }
    
    return new Promise((resolve, reject) => {
        req.session.save(err => {
            if (err) {
                console.error('Error al guardar sesión:', err);
                reject(err);
            } else {
                resolve({
                    success: true,
                    username: user.username,
                    sessionId: req.session.id
                });
            }
        });
    });
}

module.exports = {
    configureSession,
    loginUser
};
