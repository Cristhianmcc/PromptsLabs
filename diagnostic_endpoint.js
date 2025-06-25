// Endpoint de diagnóstico - Añadir a server.js justo antes de la sección de API Routes

// Endpoint de diagnóstico (solo en desarrollo o con clave secreta)
app.get('/diagnostico', (req, res) => {
    // En producción, requerir una clave secreta en la URL para acceder al diagnóstico
    if (isProd && req.query.clave !== 'promptslabs2025') {
        return res.status(403).send('Acceso denegado');
    }
    
    const diagnostico = {
        timestamp: new Date().toISOString(),
        entorno: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            PLATFORM: process.platform,
            NODE_VERSION: process.version
        },
        directorios: {
            current: __dirname,
            uploadsDir: uploadsDir,
            cleanUploadsDir: cleanUploadsDir,
            dbPath: dbPath
        },
        rutas_archivos: {
            db_exists: fs.existsSync(dbPath),
            db_dir_exists: fs.existsSync(path.dirname(dbPath)),
            uploads_dir_exists: fs.existsSync(uploadsDir)
        }
    };
    
    // Verificar número de archivos en el directorio de imágenes
    try {
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            diagnostico.imagenes = {
                total: files.length,
                ejemplos: files.slice(0, 5)
            };
        } else {
            diagnostico.imagenes = {
                error: 'Directorio de imágenes no encontrado'
            };
        }
    } catch (error) {
        diagnostico.imagenes = {
            error: error.message
        };
    }
    
    // Verificar base de datos
    db.get("SELECT COUNT(*) as total FROM prompts", [], (err, row) => {
        if (err) {
            diagnostico.base_datos = {
                error: err.message
            };
        } else {
            diagnostico.base_datos = {
                prompts_total: row.total
            };
            
            // Verificar usuarios
            db.get("SELECT COUNT(*) as total FROM users", [], (err, row) => {
                if (err) {
                    diagnostico.base_datos.usuarios = {
                        error: err.message
                    };
                } else {
                    diagnostico.base_datos.usuarios = {
                        total: row.total
                    };
                }
                
                res.json(diagnostico);
            });
        }
    });
});
