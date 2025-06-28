// Script para verificar y diagnosticar problemas con la galería

// Verificar si hay elementos en la galería
function checkGallery() {
  const galleryItems = document.querySelectorAll('.gallery-item');
  console.log(`Total de elementos en la galería: ${galleryItems.length}`);
  
  if (galleryItems.length === 0) {
    console.error('No hay elementos en la galería');
    return false;
  }
  
  // Verificar imágenes cargadas vs errores
  let loadedImages = 0;
  let errorImages = 0;
  
  galleryItems.forEach((item, index) => {
    const img = item.querySelector('img');
    if (img.complete) {
      if (img.naturalWidth === 0) {
        errorImages++;
        console.error(`Imagen ${index} no se cargó correctamente: ${img.src}`);
      } else {
        loadedImages++;
      }
    } else {
      console.log(`Imagen ${index} aún se está cargando: ${img.src}`);
    }
  });
  
  console.log(`Imágenes cargadas correctamente: ${loadedImages}`);
  console.log(`Imágenes con errores: ${errorImages}`);
  
  return true;
}

// Verificar sesión de usuario
function checkSession() {
  fetch('/api/check-session')
    .then(response => response.json())
    .then(data => {
      console.log('Estado de sesión:', data);
      if (!data.isAuthenticated) {
        console.error('No hay sesión activa. Intenta acceder a /api/auth-fix para reparar la autenticación.');
      }
    })
    .catch(error => {
      console.error('Error al verificar sesión:', error);
    });
}

// Comprobar conexión a la API
function checkAPI() {
  console.log('Verificando API...');
  
  fetch('/api/diagnostics')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Estado: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Diagnóstico del sistema:', data);
      
      if (data.dbStats && data.dbStats.promptCount === 0) {
        console.error('La base de datos no contiene prompts. Puede ser necesario ejecutar /api/db-init para inicializar datos.');
      }
      
      if (data.imagesDir && !data.imagesDir.exists) {
        console.error('El directorio de imágenes no existe. Esto causará problemas al cargar imágenes.');
      } else if (data.imagesDir && data.imagesDir.files.length === 0) {
        console.error('El directorio de imágenes está vacío. No hay imágenes para mostrar.');
      }
    })
    .catch(error => {
      console.error('Error al verificar la API:', error);
    });
}

// Función para intentar reparar errores comunes
function attemptRepair() {
  console.log('Intentando reparar problemas comunes...');
  
  // Reiniciar la sesión
  fetch('/api/auth-fix')
    .then(response => response.json())
    .then(data => {
      console.log('Resultado de auth-fix:', data);
      if (data.success) {
        console.log('La autenticación ha sido reparada. Intenta acceder al panel de administración ahora.');
      }
    })
    .catch(error => {
      console.error('Error al reparar autenticación:', error);
    });
  
  // Recargar la página después de un breve retraso
  setTimeout(() => {
    console.log('Recargando la página...');
    window.location.reload(true);
  }, 3000);
}

// Ejecutar diagnóstico completo
function runFullDiagnostic() {
  console.log('=== INICIANDO DIAGNÓSTICO COMPLETO ===');
  checkGallery();
  checkSession();
  checkAPI();
  console.log('=== FIN DEL DIAGNÓSTICO ===');
}

// Exportar funciones para uso en la consola
window.diagnostics = {
  checkGallery,
  checkSession,
  checkAPI,
  attemptRepair,
  runFullDiagnostic
};

console.log('Script de diagnóstico cargado. Usa diagnostics.runFullDiagnostic() para ejecutar todas las comprobaciones.');
