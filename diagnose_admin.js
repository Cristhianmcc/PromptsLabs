const fs = require('fs');
const path = require('path');

// Verificar si las rutas existen
const dataDir = path.join(__dirname, 'data');
const dataImagesDir = path.join(__dirname, 'data', 'images');
const rootImagesDir = path.join(__dirname, 'images');

console.log('Verificando rutas importantes:');
console.log(`- Directorio data/ existe: ${fs.existsSync(dataDir)}`);
console.log(`- Directorio data/images/ existe: ${fs.existsSync(dataImagesDir)}`);
console.log(`- Directorio images/ existe: ${fs.existsSync(rootImagesDir)}`);

// Listar archivos en directorio de imágenes
if (fs.existsSync(rootImagesDir)) {
  const files = fs.readdirSync(rootImagesDir);
  console.log(`\nNúmero de archivos en images/: ${files.length}`);
  console.log('Primeros 10 archivos:');
  files.slice(0, 10).forEach(file => {
    console.log(`- ${file}`);
  });
}

if (fs.existsSync(dataImagesDir)) {
  const files = fs.readdirSync(dataImagesDir);
  console.log(`\nNúmero de archivos en data/images/: ${files.length}`);
  console.log('Primeros 10 archivos:');
  files.slice(0, 10).forEach(file => {
    console.log(`- ${file}`);
  });
}

// Verificar archivo admin.js
const adminJsPath = path.join(__dirname, 'admin.js');
if (fs.existsSync(adminJsPath)) {
  console.log('\nVerificando admin.js...');
  const content = fs.readFileSync(adminJsPath, 'utf-8');
  
  // Buscar cómo maneja las imágenes
  if (content.includes('ensureCorrectImagePath')) {
    console.log('- admin.js utiliza la función ensureCorrectImagePath');
  } else {
    console.log('- admin.js NO utiliza la función ensureCorrectImagePath');
  }
  
  // Analizar llamadas fetch para ver qué API está usando
  if (content.includes('/api/prompts')) {
    console.log('- admin.js utiliza el endpoint /api/prompts para cargar datos');
  } else {
    console.log('- admin.js NO utiliza el endpoint /api/prompts para cargar datos');
  }
  
  // Revisar si hay algún error en la función que maneja el POST de prompts
  console.log('\nBuscando errores potenciales en saveNewPromptBtn:');
  
  const saveNewPromptBtnIndex = content.indexOf('saveNewPromptBtn.addEventListener');
  if (saveNewPromptBtnIndex > -1) {
    const codeSnippet = content.substring(saveNewPromptBtnIndex, saveNewPromptBtnIndex + 500);
    console.log(codeSnippet);
  } else {
    console.log('- No se encontró el código para saveNewPromptBtn');
  }
}

// Verificar errores en el servidor
console.log('\nVerificando server.js para potenciales errores...');
const serverJsPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverJsPath)) {
  const content = fs.readFileSync(serverJsPath, 'utf-8');
  
  // Verificar configuración de la base de datos
  if (content.includes('dbPath = path.join(__dirname, \'data\', \'prompts.db\')')) {
    console.log('- server.js está configurado para usar data/prompts.db');
  } else if (content.includes('dbPath = path.join(__dirname, \'prompts.db\')')) {
    console.log('- server.js está configurado para usar prompts.db en la raíz');
  } else {
    console.log('- No se pudo determinar qué base de datos está usando server.js');
  }
  
  // Verificar la ruta de imágenes
  if (content.includes('uploadsDir = path.join(__dirname, \'data\', \'images\')')) {
    console.log('- server.js está configurado para guardar imágenes en data/images');
  } else if (content.includes('uploadsDir = path.join(__dirname, \'images\')')) {
    console.log('- server.js está configurado para guardar imágenes en images/ en la raíz');
  } else {
    console.log('- No se pudo determinar dónde está guardando las imágenes server.js');
  }
  
  // Verificar el endpoint para guardar
  console.log('\nVerificando el endpoint POST /api/prompts:');
  const postEndpointIndex = content.indexOf('app.post(\'/api/prompts\'');
  if (postEndpointIndex > -1) {
    const codeSnippet = content.substring(postEndpointIndex, postEndpointIndex + 300);
    console.log(codeSnippet);
  } else {
    console.log('- No se encontró el endpoint POST /api/prompts');
  }
}
