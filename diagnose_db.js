const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Función para probar la conexión y consultar una base de datos
function testDatabase(dbPath) {
    console.log(`\n==========================================`);
    console.log(`Probando base de datos: ${dbPath}`);
    
    // Verificar si existe el archivo
    if (!fs.existsSync(dbPath)) {
        console.log(`❌ El archivo de base de datos NO EXISTE: ${dbPath}`);
        return Promise.resolve({
            path: dbPath,
            exists: false,
            error: 'Archivo no encontrado'
        });
    }
    
    console.log(`✅ El archivo de base de datos EXISTE: ${dbPath}`);
    console.log(`   Tamaño: ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB`);
    
    return new Promise((resolve) => {
        // Intentar conectar a la base de datos
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.log(`❌ ERROR al conectar: ${err.message}`);
                resolve({
                    path: dbPath,
                    exists: true, 
                    connected: false,
                    error: err.message
                });
                return;
            }
            
            console.log(`✅ Conexión EXITOSA a la base de datos`);
            
            // Verificar estructura de la base de datos
            db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
                if (err) {
                    console.log(`❌ ERROR al consultar tablas: ${err.message}`);
                    db.close();
                    resolve({
                        path: dbPath,
                        exists: true,
                        connected: true,
                        tables: false,
                        error: err.message
                    });
                    return;
                }
                
                const tableNames = tables.map(t => t.name);
                console.log(`✅ Tablas encontradas: ${tableNames.join(', ')}`);
                
                // Verificar si existe la tabla prompts
                if (!tableNames.includes('prompts')) {
                    console.log(`❌ FALTA la tabla 'prompts'`);
                    db.close();
                    resolve({
                        path: dbPath,
                        exists: true,
                        connected: true,
                        tables: tableNames,
                        hasPromptsTable: false
                    });
                    return;
                }
                
                // Contar registros en la tabla prompts
                db.get("SELECT COUNT(*) as count FROM prompts", [], (err, row) => {
                    if (err) {
                        console.log(`❌ ERROR al contar registros: ${err.message}`);
                        db.close();
                        resolve({
                            path: dbPath,
                            exists: true,
                            connected: true,
                            tables: tableNames,
                            hasPromptsTable: true,
                            error: err.message
                        });
                        return;
                    }
                    
                    const count = row.count;
                    console.log(`✅ La tabla 'prompts' tiene ${count} registros`);
                    
                    // Si hay registros, obtener algunos para probar
                    if (count > 0) {
                        db.all("SELECT id, image, prompt, created_at FROM prompts LIMIT 3", [], (err, rows) => {
                            if (err) {
                                console.log(`❌ ERROR al obtener prompts: ${err.message}`);
                                db.close();
                                resolve({
                                    path: dbPath,
                                    exists: true,
                                    connected: true,
                                    tables: tableNames,
                                    hasPromptsTable: true,
                                    count: count,
                                    error: err.message
                                });
                                return;
                            }
                            
                            console.log(`✅ Ejemplos de prompts:`);
                            rows.forEach(row => {
                                console.log(`   - ID: ${row.id}, Imagen: ${row.image}`);
                                console.log(`     Prompt: ${row.prompt.substring(0, 40)}...`);
                            });
                            
                            db.close();
                            resolve({
                                path: dbPath,
                                exists: true,
                                connected: true,
                                tables: tableNames,
                                hasPromptsTable: true,
                                count: count,
                                examples: rows
                            });
                        });
                    } else {
                        db.close();
                        resolve({
                            path: dbPath,
                            exists: true,
                            connected: true,
                            tables: tableNames,
                            hasPromptsTable: true,
                            count: 0
                        });
                    }
                });
            });
        });
    });
}

// Verificar directorios de imágenes
function checkImageDirectories() {
    console.log(`\n==========================================`);
    console.log(`Verificando directorios de imágenes:`);
    
    const rootImagesPath = path.join(__dirname, 'images');
    const dataImagesPath = path.join(__dirname, 'data', 'images');
    
    // Verificar directorio en raíz
    if (fs.existsSync(rootImagesPath)) {
        const files = fs.readdirSync(rootImagesPath);
        console.log(`✅ Directorio 'images' en raíz EXISTE`);
        console.log(`   Contiene ${files.length} archivos`);
        
        // Mostrar algunos ejemplos
        if (files.length > 0) {
            console.log(`   Ejemplos: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
        }
    } else {
        console.log(`❌ Directorio 'images' en raíz NO EXISTE`);
    }
    
    // Verificar directorio en data
    if (fs.existsSync(dataImagesPath)) {
        const files = fs.readdirSync(dataImagesPath);
        console.log(`✅ Directorio 'data/images' EXISTE`);
        console.log(`   Contiene ${files.length} archivos`);
        
        // Mostrar algunos ejemplos
        if (files.length > 0) {
            console.log(`   Ejemplos: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
        }
    } else {
        console.log(`❌ Directorio 'data/images' NO EXISTE`);
    }
    
    return {
        rootImagesExists: fs.existsSync(rootImagesPath),
        rootImagesCount: fs.existsSync(rootImagesPath) ? fs.readdirSync(rootImagesPath).length : 0,
        dataImagesExists: fs.existsSync(dataImagesPath),
        dataImagesCount: fs.existsSync(dataImagesPath) ? fs.readdirSync(dataImagesPath).length : 0
    };
}

// Verificar configuración del servidor
function checkServerConfig() {
    console.log(`\n==========================================`);
    console.log(`Analizando configuración del servidor:`);
    
    const serverPath = path.join(__dirname, 'server.js');
    if (!fs.existsSync(serverPath)) {
        console.log(`❌ El archivo server.js NO EXISTE`);
        return;
    }
    
    const serverCode = fs.readFileSync(serverPath, 'utf8');
    
    // Buscar definición de dbPath en el código
    const dbPathMatch = serverCode.match(/const\s+dbPath\s*=\s*([^;]+);/);
    if (dbPathMatch) {
        console.log(`✅ Definición de dbPath encontrada:`);
        console.log(`   ${dbPathMatch[0].trim()}`);
    } else {
        console.log(`❌ No se encontró definición de dbPath en server.js`);
    }
    
    // Buscar configuración de isProd en el código
    const isProdMatch = serverCode.match(/const\s+isProd\s*=\s*([^;]+);/);
    if (isProdMatch) {
        console.log(`✅ Definición de isProd encontrada:`);
        console.log(`   ${isProdMatch[0].trim()}`);
    } else {
        console.log(`❌ No se encontró definición de isProd en server.js`);
    }
    
    // Buscar ruta de imágenes en el código
    const uploadsDirMatch = serverCode.match(/const\s+uploadsDir\s*=\s*([^;]+);/);
    if (uploadsDirMatch) {
        console.log(`✅ Definición de uploadsDir encontrada:`);
        console.log(`   ${uploadsDirMatch[0].trim()}`);
    } else {
        console.log(`❌ No se encontró definición de uploadsDir en server.js`);
    }
}

// Ejecutar todas las verificaciones
async function runDiagnostics() {
    console.log(`DIAGNÓSTICO COMPLETO DE LA APLICACIÓN`);
    console.log(`=====================================`);
    console.log(`Fecha: ${new Date().toLocaleString()}`);
    console.log(`Directorio: ${__dirname}`);
    
    // Verificar todas las posibles ubicaciones de la base de datos
    const rootDbResult = await testDatabase(path.join(__dirname, 'prompts.db'));
    const dataDbResult = await testDatabase(path.join(__dirname, 'data', 'prompts.db'));
    
    // Verificar directorios de imágenes
    const imageResults = checkImageDirectories();
    
    // Verificar configuración del servidor
    checkServerConfig();
    
    // Resumen de resultados
    console.log(`\n==========================================`);
    console.log(`RESUMEN DE RESULTADOS:`);
    console.log(`- Base de datos en raíz: ${rootDbResult.exists ? 'Existe' : 'No existe'}${rootDbResult.count ? `, ${rootDbResult.count} prompts` : ''}`);
    console.log(`- Base de datos en data: ${dataDbResult.exists ? 'Existe' : 'No existe'}${dataDbResult.count ? `, ${dataDbResult.count} prompts` : ''}`);
    console.log(`- Imágenes en raíz: ${imageResults.rootImagesExists ? `${imageResults.rootImagesCount} archivos` : 'No existe'}`);
    console.log(`- Imágenes en data: ${imageResults.dataImagesExists ? `${imageResults.dataImagesCount} archivos` : 'No existe'}`);
    
    if (rootDbResult.count > 0 || dataDbResult.count > 0) {
        const workingDb = rootDbResult.count > 0 ? 'raíz' : 'data';
        console.log(`\n✅ RECOMENDACIÓN: La base de datos en ${workingDb} tiene prompts y debería ser usada.`);
    } else {
        console.log(`\n❌ ERROR: Ninguna base de datos tiene prompts. Considera inicializar una con datos.`);
    }
}

// Ejecutar diagnóstico
runDiagnostics();
