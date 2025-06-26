const fs = require('fs');
const path = require('path');

// Rutas principales
const adminJsPath = path.join(__dirname, 'admin.js');
const adminHtmlPath = path.join(__dirname, 'admin.html');

// Leer archivos
let adminJs, adminHtml;
try {
    adminJs = fs.readFileSync(adminJsPath, 'utf-8');
    adminHtml = fs.readFileSync(adminHtmlPath, 'utf-8');
    console.log('Archivos de administración leídos correctamente');
} catch (error) {
    console.error(`Error al leer archivos: ${error.message}`);
    process.exit(1);
}

// Verificar y corregir problemas en admin.html
console.log('\nVerificando admin.html...');

let adminHtmlFixed = adminHtml;

// Verificar que el formulario tenga el atributo enctype correcto
if (!adminHtml.includes('enctype="multipart/form-data"')) {
    console.log('Corrigiendo atributo enctype en el formulario addPromptForm');
    adminHtmlFixed = adminHtmlFixed.replace(
        /<form id="addPromptForm"([^>]*)>/g,
        '<form id="addPromptForm" enctype="multipart/form-data"$1>'
    );
}

// Verificar campo de imagen en el formulario
if (!adminHtml.includes('name="image"')) {
    console.log('Advertencia: Campo de imagen puede tener un nombre incorrecto');
}

// Guardar admin.html si hubo cambios
if (adminHtmlFixed !== adminHtml) {
    try {
        fs.writeFileSync(adminHtmlPath, adminHtmlFixed);
        console.log('admin.html actualizado correctamente');
    } catch (error) {
        console.error(`Error al guardar admin.html: ${error.message}`);
    }
} else {
    console.log('No se requieren cambios en admin.html');
}

// Verificar y corregir problemas en admin.js
console.log('\nVerificando admin.js...');

let adminJsFixed = adminJs;

// Agregar console.log adicionales para depuración
if (!adminJs.includes('console.log(\'Formulario enviado:')) {
    console.log('Agregando logs de depuración para ver qué contiene el FormData');
    
    const targetCode = 
`        console.log('Enviando datos del nuevo prompt:', {
            prompt: formData.get('prompt'),
            imageFileName: formData.get('image').name,
            imageSize: formData.get('image').size,
            imageType: formData.get('image').type
        });`;
    
    const replacementCode = 
`        // Log adicional para depuración del FormData
        console.log('Formulario enviado:', formData);
        // Log de cada entrada en el FormData
        for (const pair of formData.entries()) {
            console.log(\`\${pair[0]}: \${pair[1]}\`);
        }
        
        console.log('Enviando datos del nuevo prompt:', {
            prompt: formData.get('prompt'),
            imageFileName: formData.get('image') ? formData.get('image').name : 'no image',
            imageSize: formData.get('image') ? formData.get('image').size : 0,
            imageType: formData.get('image') ? formData.get('image').type : 'unknown'
        });`;
    
    adminJsFixed = adminJsFixed.replace(targetCode, replacementCode);
}

// Agregar verificación de autenticación antes de intentar guardar
if (!adminJs.includes('checkAuthentication')) {
    console.log('Agregando función de verificación de autenticación');
    
    const funcToAdd = `
    // Función para verificar si el usuario está autenticado
    function checkAuthentication() {
        return fetch('/api/check-session')
            .then(response => response.json())
            .then(data => {
                if (!data.isAuthenticated) {
                    console.error('No estás autenticado. Se te redirigirá a la página de login.');
                    showAlert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'warning');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                    return false;
                }
                return true;
            })
            .catch(error => {
                console.error('Error al verificar autenticación:', error);
                return true; // Por defecto continuar aunque falle la verificación
            });
    }`;
    
    // Agregar función al final del archivo
    adminJsFixed = adminJsFixed.replace(
        /\s*}\);$/,
        `\n${funcToAdd}\n});`
    );
    
    // Modificar saveNewPromptBtn para verificar autenticación
    const saveButtonCode = `saveNewPromptBtn.addEventListener('click', function() {`;
    const newSaveButtonCode = `saveNewPromptBtn.addEventListener('click', function() {
        // Verificar autenticación antes de continuar
        checkAuthentication().then(isAuthenticated => {
            if (!isAuthenticated) return;
            
            // Continuar con el envío del formulario`;
    
    adminJsFixed = adminJsFixed.replace(
        saveButtonCode,
        newSaveButtonCode
    );
    
    // Cerrar la función envuelta
    adminJsFixed = adminJsFixed.replace(
        `        });
    });
    
    // Guardar cambios en prompt existente`,
        `            });
        });
    });
    
    // Guardar cambios en prompt existente`
    );
}

// Guardar admin.js si hubo cambios
if (adminJsFixed !== adminJs) {
    try {
        fs.writeFileSync(adminJsPath, adminJsFixed);
        console.log('admin.js actualizado correctamente');
    } catch (error) {
        console.error(`Error al guardar admin.js: ${error.message}`);
    }
} else {
    console.log('No se requieren cambios en admin.js');
}

console.log(`
===== CORRECCIÓN FINALIZADA =====

Se han aplicado las siguientes mejoras:
1. Verificación del atributo enctype en el formulario
2. Logs adicionales para depurar el contenido del formulario
3. Verificación de autenticación antes de enviar el formulario

Pasos adicionales:
1. Reinicia el servidor Node.js (Ctrl+C y luego node server.js)
2. Ejecuta node admin_fix.js para corregir problemas con la base de datos
3. Asegúrate de iniciar sesión en /login.html antes de intentar agregar prompts
4. Verifica la consola del navegador para ver mensajes de error detallados

Si sigues teniendo problemas:
- Asegúrate de que el servidor esté mostrando logs cuando intentas guardar un prompt
- Verifica que el campo 'prompt' contenga texto y que hayas seleccionado una imagen
- Asegúrate de que la propiedad name="image" esté correctamente definida en el input file
`);
