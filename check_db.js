const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Función para contar registros en una base de datos
function countRecords(dbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error(`Error al abrir la base de datos ${dbPath}:`, err.message);
        return reject(err);
      }
      
      db.get('SELECT COUNT(*) as count FROM prompts', [], (err, row) => {
        if (err) {
          console.error(`Error al contar registros en ${dbPath}:`, err.message);
          db.close();
          return reject(err);
        }
        
        db.close();
        resolve({ path: dbPath, count: row.count });
      });
    });
  });
}

// Verificar ambas bases de datos
const rootDbPath = path.join(__dirname, 'prompts.db');
const dataDbPath = path.join(__dirname, 'data', 'prompts.db');

console.log(`Verificando base de datos en raíz: ${rootDbPath}`);
console.log(`Verificando base de datos en data: ${dataDbPath}`);

Promise.all([
  countRecords(rootDbPath).catch(err => ({ path: rootDbPath, error: err.message })),
  countRecords(dataDbPath).catch(err => ({ path: dataDbPath, error: err.message }))
])
.then(results => {
  console.log('\nResultados:');
  results.forEach(result => {
    if (result.error) {
      console.log(`- ${result.path}: ERROR - ${result.error}`);
    } else {
      console.log(`- ${result.path}: ${result.count} prompts`);
    }
  });
})
.catch(err => {
  console.error('Error general:', err);
});
