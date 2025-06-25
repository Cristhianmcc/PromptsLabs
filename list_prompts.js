const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar a la base de datos
const dbPath = path.join(__dirname, 'data', 'prompts.db');
console.log(`Conectando a la base de datos en: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
    process.exit(1);
  }
  
  console.log('Conexión a la base de datos establecida');
  
  // Consultar prompts y sus categorías
  db.all(`
    SELECT p.id, p.image, p.prompt, p.created_at, GROUP_CONCAT(c.name) as categories
    FROM prompts p
    LEFT JOIN prompt_categories pc ON p.id = pc.prompt_id
    LEFT JOIN categories c ON pc.category_id = c.id
    GROUP BY p.id
    ORDER BY p.id
  `, [], (err, rows) => {
    if (err) {
      console.error('Error al consultar prompts:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log(`Se encontraron ${rows.length} prompts:\n`);
    
    rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Imagen: ${row.image}`);
      console.log(`Prompt: ${row.prompt.substring(0, 100)}...`);
      console.log(`Creado: ${row.created_at}`);
      console.log(`Categorías: ${row.categories || 'Sin categorías'}`);
      console.log('-'.repeat(80));
    });
    
    db.close();
  });
});
