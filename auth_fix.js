// Mejora en el servidor para verificar la autenticación
// Añade esta función al archivo server.js, justo después de la función createDefaultAdmin()

// Función para verificar la configuración de autenticación
function checkAuthSetup() {
  return new Promise((resolve, reject) => {
    // Verificar si hay usuarios en la tabla
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
      if (err) {
        console.error('Error al contar usuarios:', err.message);
        reject(err);
        return;
      }
      
      console.log(`Usuarios encontrados en la base de datos: ${row.count}`);
      
      // Si no hay usuarios, crear uno por defecto
      if (row.count === 0) {
        console.log('No se encontraron usuarios, creando admin por defecto...');
        createDefaultAdmin();
        resolve(true);
      } else {
        // Verificar credenciales predeterminadas
        const username = 'admin';
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
          if (err) {
            console.error('Error al verificar usuario admin:', err.message);
            reject(err);
            return;
          }
          
          if (user) {
            console.log('Usuario admin encontrado en la base de datos');
            resolve(true);
          } else {
            console.log('¡Alerta! Usuario admin no encontrado');
            createDefaultAdmin();
            resolve(true);
          }
        });
      }
    });
  });
}

// Añade esta llamada al final de la conexión a la base de datos
// Ubícala justo después de crear las tablas, al final de db.serialize()
checkAuthSetup()
  .then(() => console.log('Verificación de autenticación completada'))
  .catch(err => console.error('Error en verificación de autenticación:', err.message));
