const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configurar rutas
const dbPath = path.join(__dirname, 'data', 'prompts.db');
const serverJsPath = path.join(__dirname, 'server.js');

console.log('===== CORRECTOR DE PROBLEMAS DE GUARDADO Y EDICIÓN =====');
console.log(`Fecha y hora: ${new Date().toISOString()}`);

// Verificar el error en el manejo de categorías
console.log('\n1. Analizando el código del servidor...');

// Leer el archivo server.js
try {
    let serverContent = fs.readFileSync(serverJsPath, 'utf8');
    
    // Buscar el código del POST /api/prompts
    if (serverContent.includes('app.post(\'/api/prompts\',')) {
        console.log('- Encontrado endpoint POST /api/prompts');
        
        // Buscar el manejo de categorías
        if (serverContent.includes('const categoriesArray = Array.isArray(categories) ? categories : [categories];')) {
            console.log('- Encontrado manejo de categorías');
            
            // Corregir el problema principal: la ausencia de manejo correcto para cuando no hay categorías
            let modificado = false;
            
            // Corrige el problema de promesa no completada cuando no hay categorías
            const problematicCode = `if (categories && categories.length > 0) {
                const categoriesArray = Array.isArray(categories) ? categories : [categories];
                
                // Primero asegurarse de que todas las categorías existen
                const insertCategoryPromises = categoriesArray.map(category => {`;
            
            const fixedCode = `if (categories && categories.length > 0) {
                const categoriesArray = Array.isArray(categories) ? categories : [categories];
                
                // Primero asegurarse de que todas las categorías existen
                const insertCategoryPromises = categoriesArray.map(category => {`;
            
            // Corrige el manejo de la respuesta para que funcione incluso sin categorías
            const problematicResponseCode = `                    .then(() => {
                        // Enviar respuesta con información completa del prompt creado
                        const result = {
                            success: true, 
                            message: 'Prompt guardado correctamente',
                            prompt: {
                                id: promptId,
                                prompt: prompt,
                                image: \`/images/\${imagePath}\`,
                                categories: categoriesArray || [],
                                created_at: new Date().toISOString()
                            }
                        };
                        console.log('Enviando respuesta:', result);
                        res.json(result);
                    })
                    .catch(err => {
                        console.error('Error al procesar categorías:', err);
                        res.status(500).json({ 
                            success: false, 
                            message: 'Error al procesar categorías' 
                        });
                    });`;
            
            const fixedResponseCode = `                    .then(() => {
                        // Enviar respuesta con información completa del prompt creado
                        const result = {
                            success: true, 
                            message: 'Prompt guardado correctamente',
                            prompt: {
                                id: promptId,
                                prompt: prompt,
                                image: \`/images/\${imagePath}\`,
                                categories: categoriesArray || [],
                                created_at: new Date().toISOString()
                            }
                        };
                        console.log('Enviando respuesta:', result);
                        res.json(result);
                    })
                    .catch(err => {
                        console.error('Error al procesar categorías:', err);
                        res.status(500).json({ 
                            success: false, 
                            message: 'Error al procesar categorías' 
                        });
                    });`;
                    
            // Corrige el problema principal: agregar respuesta fuera del bloque de categorías
            const missingElseBlock = `            } else {
                // Si no hay categorías, enviar respuesta directamente
                const result = {
                    success: true, 
                    message: 'Prompt guardado correctamente sin categorías',
                    prompt: {
                        id: promptId,
                        prompt: prompt,
                        image: \`/images/\${imagePath}\`,
                        categories: [],
                        created_at: new Date().toISOString()
                    }
                };
                console.log('Enviando respuesta sin categorías:', result);
                res.json(result);
            }`;
            
            // Buscar el punto de inserción correcto
            const insertionPoint = `            if (categories && categories.length > 0) {`;
            const insertionPointEnd = `            } else {
                // Si no hay categorías, enviar respuesta directamente`;
            
            if (serverContent.includes(insertionPoint) && !serverContent.includes(insertionPointEnd)) {
                // El problema existe y no está corregido
                console.log('- Detectado problema: No hay manejo cuando no se proporcionan categorías');
                
                // Encontrar el punto exacto para agregar el bloque else
                const endOfCategoriesBlock = serverContent.indexOf(`                    .catch(err => {
                        console.error('Error al procesar categorías:', err);
                        res.status(500).json({ 
                            success: false, 
                            message: 'Error al procesar categorías' 
                        });
                    });`);
                
                if (endOfCategoriesBlock !== -1) {
                    // Encontrar el final del bloque
                    const endOfSection = endOfCategoriesBlock + `                    .catch(err => {
                        console.error('Error al procesar categorías:', err);
                        res.status(500).json({ 
                            success: false, 
                            message: 'Error al procesar categorías' 
                        });
                    });`.length;
                    
                    // Insertar el bloque else después del bloque completo de categorías
                    const before = serverContent.substring(0, endOfSection);
                    const after = serverContent.substring(endOfSection);
                    
                    serverContent = before + missingElseBlock + after;
                    modificado = true;
                    console.log('- Agregado bloque else para manejar el caso sin categorías');
                }
            } else if (serverContent.includes(insertionPointEnd)) {
                console.log('- El manejo de categorías ya parece estar corregido');
            }
            
            // Corrige el endpoint PUT para editar prompts
            const problematicUpdateCode = `app.put('/api/prompts/:id', isAuthenticated, upload.single('image'), (req, res) => {`;
            const fixedUpdateCode = `app.put('/api/prompts/:id', isAuthenticated, upload.single('image'), (req, res) => {
    console.log('===== RECIBIDA PETICIÓN PARA ACTUALIZAR PROMPT =====');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Archivo:', req.file);
    console.log('Sesión:', req.session);`;
            
            if (serverContent.includes(problematicUpdateCode) && !serverContent.includes('===== RECIBIDA PETICIÓN PARA ACTUALIZAR PROMPT =====')) {
                serverContent = serverContent.replace(problematicUpdateCode, fixedUpdateCode);
                modificado = true;
                console.log('- Agregado logging mejorado para endpoint de actualización');
            }
            
            // Si se modificó el archivo, guardarlo
            if (modificado) {
                // Hacer una copia de seguridad
                const backupPath = path.join(__dirname, `server.js.bak_${Date.now()}`);
                fs.writeFileSync(backupPath, fs.readFileSync(serverJsPath));
                console.log(`- Creada copia de seguridad en ${backupPath}`);
                
                // Guardar los cambios
                fs.writeFileSync(serverJsPath, serverContent);
                console.log('- Cambios guardados en server.js');
            } else {
                console.log('- No se realizaron modificaciones al archivo server.js');
            }
        } else {
            console.log('- No se encontró el manejo de categorías en el código');
        }
    } else {
        console.log('- No se encontró el endpoint POST /api/prompts');
    }
} catch (error) {
    console.error(`Error al leer/modificar server.js: ${error.message}`);
}

// Verificar y corregir la base de datos
console.log('\n2. Verificando la base de datos...');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        return console.error(`Error al abrir base de datos: ${err.message}`);
    }
    
    // Verificar integridad de las tablas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error(`Error al verificar tablas: ${err.message}`);
            db.close();
            return;
        }
        
        const tableNames = tables.map(t => t.name);
        console.log(`- Tablas encontradas: ${tableNames.join(', ')}`);
        
        // Verificar índices y constraints
        db.all("PRAGMA integrity_check", [], (err, results) => {
            if (err) {
                console.error(`Error al verificar integridad: ${err.message}`);
            } else if (results && results.length > 0) {
                console.log(`- Integridad de la base de datos: ${results[0].integrity_check}`);
            }
            
            // Verificar y corregir relaciones entre prompts y categorías
            db.all(`
                SELECT p.id, p.prompt, p.image, COUNT(pc.id) as category_count 
                FROM prompts p 
                LEFT JOIN prompt_categories pc ON p.id = pc.prompt_id
                GROUP BY p.id
            `, [], (err, prompts) => {
                if (err) {
                    console.error(`Error al verificar relaciones: ${err.message}`);
                    db.close();
                    return;
                }
                
                console.log(`- Encontrados ${prompts.length} prompts en la base de datos`);
                
                const promptsSinCategorias = prompts.filter(p => p.category_count === 0);
                console.log(`- Prompts sin categorías: ${promptsSinCategorias.length}`);
                
                // Si hay prompts sin categorías, podríamos asignarles una categoría por defecto
                if (promptsSinCategorias.length > 0) {
                    db.get("SELECT id FROM categories WHERE name='General' LIMIT 1", [], (err, generalCategory) => {
                        if (err || !generalCategory) {
                            // Crear categoría General si no existe
                            db.run("INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)", 
                                ['General', 'general', 'Categoría general para prompts sin clasificar'],
                                function(err) {
                                    if (err) {
                                        console.error(`Error al crear categoría General: ${err.message}`);
                                        db.close();
                                        return;
                                    }
                                    
                                    const generalId = this.lastID;
                                    console.log(`- Creada categoría General con ID ${generalId}`);
                                    
                                    // Asignar categoría General a los prompts sin categorías
                                    const promises = promptsSinCategorias.map(prompt => {
                                        return new Promise((resolve, reject) => {
                                            db.run("INSERT INTO prompt_categories (prompt_id, category_id) VALUES (?, ?)",
                                                [prompt.id, generalId],
                                                function(err) {
                                                    if (err) {
                                                        reject(err);
                                                    } else {
                                                        resolve();
                                                    }
                                                }
                                            );
                                        });
                                    });
                                    
                                    Promise.all(promises)
                                        .then(() => {
                                            console.log(`- Asignada categoría General a ${promptsSinCategorias.length} prompts`);
                                            db.close();
                                            console.log('\n===== CORRECCIÓN COMPLETADA =====');
                                            console.log('Por favor, reinicia el servidor para aplicar los cambios.');
                                        })
                                        .catch(err => {
                                            console.error(`Error al asignar categorías: ${err.message}`);
                                            db.close();
                                            console.log('\n===== CORRECCIÓN PARCIAL =====');
                                        });
                                }
                            );
                        } else {
                            // Usar la categoría General existente
                            const generalId = generalCategory.id;
                            console.log(`- Encontrada categoría General con ID ${generalId}`);
                            
                            // Asignar categoría General a los prompts sin categorías
                            const promises = promptsSinCategorias.map(prompt => {
                                return new Promise((resolve, reject) => {
                                    db.run("INSERT INTO prompt_categories (prompt_id, category_id) VALUES (?, ?)",
                                        [prompt.id, generalId],
                                        function(err) {
                                            if (err) {
                                                reject(err);
                                            } else {
                                                resolve();
                                            }
                                        }
                                    );
                                });
                            });
                            
                            Promise.all(promises)
                                .then(() => {
                                    console.log(`- Asignada categoría General a ${promptsSinCategorias.length} prompts`);
                                    db.close();
                                    console.log('\n===== CORRECCIÓN COMPLETADA =====');
                                    console.log('Por favor, reinicia el servidor para aplicar los cambios.');
                                })
                                .catch(err => {
                                    console.error(`Error al asignar categorías: ${err.message}`);
                                    db.close();
                                    console.log('\n===== CORRECCIÓN PARCIAL =====');
                                });
                        }
                    });
                } else {
                    db.close();
                    console.log('\n===== CORRECCIÓN COMPLETADA =====');
                    console.log('Por favor, reinicia el servidor para aplicar los cambios.');
                }
            });
        });
    });
});
