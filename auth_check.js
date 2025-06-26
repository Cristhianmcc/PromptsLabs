const fetch = require('node-fetch');

// Función para verificar la sesión actual
async function checkSession() {
  try {
    console.log('Verificando estado de la sesión...');
    const response = await fetch('http://localhost:3000/api/check-session');
    
    if (!response.ok) {
      console.error(`Error al verificar sesión: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al conectar con el servidor:', error.message);
    return null;
  }
}

// Función para intentar arreglar la autenticación
async function fixAuth() {
  try {
    console.log('Intentando reparar autenticación...');
    const response = await fetch('http://localhost:3000/api/auth-fix');
    
    if (!response.ok) {
      console.error(`Error al reparar autenticación: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al conectar con el servidor:', error.message);
    return null;
  }
}

// Función para intentar iniciar sesión
async function login() {
  try {
    console.log('Intentando iniciar sesión con admin/admin123...');
    
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (!response.ok) {
      console.error(`Error al iniciar sesión: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Respuesta del servidor:', errorText);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al conectar con el servidor:', error.message);
    return null;
  }
}

// Función para verificar datos de la API
async function checkAPI() {
  try {
    console.log('Verificando respuesta de /api/prompts...');
    const response = await fetch('http://localhost:3000/api/prompts');
    
    if (!response.ok) {
      console.error(`Error al obtener prompts: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`Recibidos ${data.length} prompts de la API`);
    
    if (data.length > 0) {
      console.log('Ejemplo del primer prompt:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
    return data;
  } catch (error) {
    console.error('Error al conectar con el servidor:', error.message);
    return null;
  }
}

// Ejecutar todas las verificaciones
async function runAllChecks() {
  console.log('===== DIAGNÓSTICO DE AUTENTICACIÓN Y API =====');
  console.log('Asegúrate de que el servidor esté en ejecución en http://localhost:3000');
  
  // Verificar sesión actual
  const sessionData = await checkSession();
  console.log('\n--- Estado de la sesión ---');
  if (sessionData) {
    console.log('Respuesta:', sessionData);
    console.log(`Autenticado: ${sessionData.isAuthenticated ? 'SÍ' : 'NO'}`);
    
    if (!sessionData.isAuthenticated) {
      console.log('\n--- Intentando reparar autenticación ---');
      const fixData = await fixAuth();
      if (fixData) {
        console.log('Respuesta:', fixData);
        console.log(`Reparación exitosa: ${fixData.success ? 'SÍ' : 'NO'}`);
        
        // Intentar iniciar sesión
        console.log('\n--- Intentando iniciar sesión ---');
        const loginData = await login();
        if (loginData) {
          console.log('Respuesta:', loginData);
          console.log(`Inicio de sesión exitoso: ${loginData.success ? 'SÍ' : 'NO'}`);
          
          // Verificar sesión de nuevo
          console.log('\n--- Verificando sesión después de iniciar sesión ---');
          const newSessionData = await checkSession();
          if (newSessionData) {
            console.log('Respuesta:', newSessionData);
            console.log(`Autenticado: ${newSessionData.isAuthenticated ? 'SÍ' : 'NO'}`);
          }
        }
      }
    }
  }
  
  // Verificar API
  console.log('\n--- Verificando API de prompts ---');
  const apiData = await checkAPI();
  
  console.log('\n===== FIN DEL DIAGNÓSTICO =====');
}

// Ejecutar diagnóstico
runAllChecks();
