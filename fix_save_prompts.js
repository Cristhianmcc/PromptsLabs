// Corrección manual del servidor para arreglar problemas con el guardado de prompts
const fs = require('fs');
const path = require('path');

// Ruta al servidor
const serverJsPath = path.join(__dirname, 'server.js');

// Crear copia de seguridad
const backupPath = path.join(__dirname, `server.js.bak_${Date.now()}`);
fs.copyFileSync(serverJsPath, backupPath);
console.log(`Copia de seguridad creada en ${backupPath}`);

// Leer el archivo
let serverContent = fs.readFileSync(serverJsPath, 'utf8');

// Buscar el código problemático
const codePattern = `            if (categories && categories.length > 0) {
                const categoriesArray = Array.isArray(categories) ? categories : [categories];
                
                // Primero asegurarse de que todas las categorías existen
                const insertCategoryPromises = categoriesArray.map(category => {
                    return new Promise((resolve, reject) => {
                        const slug = category.toLowerCase()
                            .replace(/\\s+/g, '-')
                            .replace(/[^\\w\\-]+/g, '')
                            .replace(/\\-\\-+/g, '-');
                        
                        // Intentar insertar la categoría si no existe
                        db.run("INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)",
                            [category, slug, \`Prompts de la categoría \${category}\`],
                            function(err) {
                                if (err) {
                                    console.error(\`Error al insertar categoría \${category}:\`, err.message);
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
                                            console.error(\`Error al relacionar prompt \${promptId} con categoría \${category}:\`, err.message);
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

// Código corregido
const fixedCode = `            if (categories && categories.length > 0) {
                const categoriesArray = Array.isArray(categories) ? categories : [categories];
                
                // Primero asegurarse de que todas las categorías existen
                const insertCategoryPromises = categoriesArray.map(category => {
                    return new Promise((resolve, reject) => {
                        const slug = category.toLowerCase()
                            .replace(/\\s+/g, '-')
                            .replace(/[^\\w\\-]+/g, '')
                            .replace(/\\-\\-+/g, '-');
                        
                        // Intentar insertar la categoría si no existe
                        db.run("INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)",
                            [category, slug, \`Prompts de la categoría \${category}\`],
                            function(err) {
                                if (err) {
                                    console.error(\`Error al insertar categoría \${category}:\`, err.message);
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
                                            console.error(\`Error al relacionar prompt \${promptId} con categoría \${category}:\`, err.message);
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
                    });
            } else {
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

// Reemplazar el código
if (serverContent.includes(codePattern)) {
    serverContent = serverContent.replace(codePattern, fixedCode);
    
    // Guardar los cambios
    fs.writeFileSync(serverJsPath, serverContent);
    console.log('Código actualizado correctamente');
    console.log('Por favor reinicia el servidor para aplicar los cambios');
} else {
    console.log('No se encontró el patrón de código exacto para reemplazar');
    console.log('Se requiere revisión manual del archivo server.js');
}
