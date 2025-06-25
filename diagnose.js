const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configurar rutas
const dbPath = path.join(__dirname, 'data', 'prompts.db');
const dataImagesDir = path.join(__dirname, 'data', 'images');
const rootImagesDir = path.join(__dirname, 'images');

console.log(`Verificando existencia de imágenes referenciadas en la base de datos ${dbPath}`);

// Conectar a la base de datos
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error(`Error al abrir la base de datos: ${err.message}`);
    process.exit(1);
  }

  console.log('Conexión exitosa a la base de datos');
  
  // Consultar todas las imágenes en la base de datos
  db.all('SELECT id, image, prompt FROM prompts', [], (err, rows) => {
    if (err) {
      console.error(`Error al consultar la base de datos: ${err.message}`);
      db.close();
      process.exit(1);
    }
    
    console.log(`Se encontraron ${rows.length} registros en la tabla prompts\n`);
    
    const imagesNotFound = [];
    const imagesFound = [];
    
    rows.forEach(row => {
      let imagePath = row.image;
      let normalizedPath = imagePath;
      
      // Normalizar la ruta
      if (normalizedPath && normalizedPath.startsWith('/images/')) {
        normalizedPath = normalizedPath.substring(8); // Quitar "/images/"
      } else if (normalizedPath && normalizedPath.startsWith('images/')) {
        normalizedPath = normalizedPath.substring(7); // Quitar "images/"
      }
      
      // Verificar en ambas ubicaciones
      const dataImagePath = path.join(dataImagesDir, normalizedPath);
      const rootImagePath = path.join(rootImagesDir, normalizedPath);
      
      const existsInData = fs.existsSync(dataImagePath);
      const existsInRoot = fs.existsSync(rootImagePath);
      
      if (existsInData || existsInRoot) {
        imagesFound.push({
          id: row.id,
          image: imagePath,
          normalizedPath: normalizedPath,
          foundIn: existsInData ? 'data/images' : 'images',
          fullPath: existsInData ? dataImagePath : rootImagePath
        });
      } else {
        imagesNotFound.push({
          id: row.id,
          prompt: row.prompt.substring(0, 30) + '...',
          image: imagePath,
          normalizedPath: normalizedPath,
          checkedPaths: [dataImagePath, rootImagePath]
        });
      }
    });
    
    console.log(`\n===== RESULTADOS =====`);
    console.log(`Imágenes encontradas: ${imagesFound.length}`);
    console.log(`Imágenes no encontradas: ${imagesNotFound.length}\n`);
    
    if (imagesFound.length > 0) {
      console.log('IMÁGENES ENCONTRADAS:');
      imagesFound.forEach(img => {
        console.log(`- ID ${img.id}: ${img.image} (encontrada en ${img.foundIn})`);
      });
      console.log('');
    }
    
    if (imagesNotFound.length > 0) {
      console.log('IMÁGENES NO ENCONTRADAS:');
      imagesNotFound.forEach(img => {
        console.log(`- ID ${img.id}: ${img.image}`);
        console.log(`  Prompt: ${img.prompt}`);
        console.log(`  Rutas verificadas:`);
        img.checkedPaths.forEach(p => console.log(`    - ${p}`));
      });
    }
    
    // Cerrar la base de datos
    db.close();
  });
});
