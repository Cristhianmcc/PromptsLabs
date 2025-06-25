const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configurar rutas para ambas posibles ubicaciones de la base de datos
const dbPathData = path.join(__dirname, 'data', 'prompts.db');
const dbPathRoot = path.join(__dirname, 'prompts.db');
const dataImagesDir = path.join(__dirname, 'data', 'images');
const rootImagesDir = path.join(__dirname, 'images');

console.log('===== DIAGNÓSTICO COMPLETO =====');
console.log(`Fecha y hora: ${new Date().toLocaleString()}`);
console.log(`\n=== ESTRUCTURA DE DIRECTORIOS ===`);

// Verificar la existencia de directorios clave
const dirs = [
  { path: path.join(__dirname, 'data'), name: 'data/' },
  { path: dataImagesDir, name: 'data/images/' },
  { path: rootImagesDir, name: 'images/' }
];

dirs.forEach(dir => {
  const exists = fs.existsSync(dir.path);
  console.log(`${dir.name}: ${exists ? 'EXISTE' : 'NO EXISTE'}`);
  
  if (exists) {
    try {
      const stats = fs.statSync(dir.path);
      console.log(`  - Es directorio: ${stats.isDirectory()}`);
      console.log(`  - Permisos: ${stats.mode.toString(8)}`);
      
      // Listar algunos archivos en el directorio
      const files = fs.readdirSync(dir.path).slice(0, 5);
      console.log(`  - Muestra de archivos (max 5): ${files.join(', ')}${files.length >= 5 ? '...' : ''}`);
      console.log(`  - Total archivos: ${fs.readdirSync(dir.path).length}`);
    } catch (error) {
      console.error(`  - Error al inspeccionar ${dir.name}: ${error.message}`);
    }
  }
});

console.log(`\n=== BASES DE DATOS ===`);

// Verificar bases de datos
const dbPaths = [
  { path: dbPathData, name: 'data/prompts.db' },
  { path: dbPathRoot, name: 'prompts.db (raíz)' }
];

dbPaths.forEach(dbInfo => {
  const exists = fs.existsSync(dbInfo.path);
  console.log(`${dbInfo.name}: ${exists ? 'EXISTE' : 'NO EXISTE'}`);
  
  if (exists) {
    try {
      const stats = fs.statSync(dbInfo.path);
      console.log(`  - Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`  - Última modificación: ${stats.mtime}`);
      
      // Intentar abrir la base de datos y contar registros
      try {
        const db = new sqlite3.Database(dbInfo.path, sqlite3.OPEN_READONLY);
        
        // Verificar tabla prompts
        db.get("SELECT count(*) as count FROM prompts", [], (err, row) => {
          if (err) {
            console.error(`  - Error al consultar tabla prompts: ${err.message}`);
          } else {
            console.log(`  - Registros en tabla prompts: ${row.count}`);
            
            // Si hay registros, obtener una muestra
            if (row.count > 0) {
              db.all("SELECT id, image, substr(prompt, 1, 30) as prompt_preview FROM prompts LIMIT 3", [], (err, rows) => {
                if (err) {
                  console.error(`  - Error al obtener muestra de prompts: ${err.message}`);
                } else {
                  console.log(`  - Muestra de prompts:`);
                  rows.forEach(row => {
                    console.log(`    * ID ${row.id}: Imagen "${row.image}", Prompt "${row.prompt_preview}..."`);
                  });
                }
                
                // Verificar coherencia de rutas de imágenes
                console.log(`\n=== VERIFICACIÓN DE RUTAS DE IMÁGENES ===`);
                db.all("SELECT id, image FROM prompts", [], (err, rows) => {
                  if (err) {
                    console.error(`Error al consultar imágenes: ${err.message}`);
                  } else {
                    console.log(`Analizando ${rows.length} rutas de imágenes...`);
                    
                    let existenEnData = 0;
                    let existenEnRoot = 0;
                    let noExisten = 0;
                    
                    rows.forEach(row => {
                      let imgName = row.image;
                      
                      // Normalizar el nombre de archivo (quitar prefijos)
                      if (imgName.startsWith('/images/')) {
                        imgName = imgName.substring(8);
                      } else if (imgName.startsWith('images/')) {
                        imgName = imgName.substring(7);
                      }
                      
                      const pathInData = path.join(dataImagesDir, imgName);
                      const pathInRoot = path.join(rootImagesDir, imgName);
                      
                      const existsInData = fs.existsSync(pathInData);
                      const existsInRoot = fs.existsSync(pathInRoot);
                      
                      if (existsInData) existenEnData++;
                      if (existsInRoot) existenEnRoot++;
                      if (!existsInData && !existsInRoot) noExisten++;
                    });
                    
                    console.log(`Resumen de imágenes:`);
                    console.log(`- Encontradas en data/images: ${existenEnData} de ${rows.length}`);
                    console.log(`- Encontradas en images/: ${existenEnRoot} de ${rows.length}`);
                    console.log(`- No encontradas: ${noExisten} de ${rows.length}`);
                  }
                  
                  console.log(`\n=== VERIFICACIÓN DEL ENDPOINT API/PROMPTS ===`);
                  console.log('Para completar el diagnóstico, verifica manualmente:');
                  console.log('1. Accede a http://localhost:3000/api/prompts en tu navegador');
                  console.log('2. Verifica que devuelve datos JSON y no errores');
                  console.log('3. Comprueba que las rutas de imágenes sean correctas');
                  console.log('4. Asegúrate de que puedes cargar las imágenes directamente en el navegador');
                  
                  console.log(`\n===== FIN DEL DIAGNÓSTICO =====`);
                  
                  // Cerrar conexión a la base de datos
                  db.close();
                });
              });
            } else {
              console.log(`  - No hay registros en la tabla prompts`);
              db.close();
            }
          }
        });
      } catch (error) {
        console.error(`  - Error al abrir la base de datos: ${error.message}`);
      }
    } catch (error) {
      console.error(`  - Error al inspeccionar ${dbInfo.name}: ${error.message}`);
    }
  }
});
