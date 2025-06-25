# Guía de Solución de Problemas en Render

Si enfrentas problemas con el despliegue de la aplicación en Render, sigue esta guía paso a paso para resolverlos.

## Problema: Error "no such table: categories"

Este error ocurre cuando la aplicación intenta insertar datos en tablas que aún no se han creado completamente.

### Solución:

1. **Accede a la consola SSH de Render**:
   - Ve al panel de control de tu servicio en Render
   - Haz clic en "Shell" en el menú lateral
   - Esto abrirá una consola SSH conectada a tu instancia

2. **Ejecuta el script de recuperación de emergencia**:
   ```bash
   chmod +x ./emergency_recovery.sh
   ./emergency_recovery.sh
   ```

3. **Reinicia el servicio**:
   - Vuelve al panel de control
   - Haz clic en "Manual Deploy" > "Deploy latest commit"

## Problema: Imágenes no visibles después del despliegue

Si las imágenes no aparecen en la galería después del despliegue:

### Solución:

1. **Verifica los archivos en el volumen persistente**:
   ```bash
   ls -la ./data/images/
   ```

2. **Copia manualmente las imágenes de ejemplo**:
   ```bash
   mkdir -p ./data/images
   cp -v ./images/placeholder.jpg ./data/images/
   cp -v ./images/1.jpg ./data/images/
   cp -v ./images/2.jpg ./data/images/
   # ... (continúa con las otras imágenes)
   ```

3. **Verifica permisos**:
   ```bash
   chmod -R 755 ./data/images
   ```

## Problema: La base de datos existe pero está vacía

Si la base de datos se crea pero no contiene datos:

### Solución:

1. **Accede al endpoint de diagnóstico** (después de iniciar sesión como administrador):
   ```
   https://tu-dominio.onrender.com/api/diagnostics
   ```

2. **Si la base de datos está vacía, puedes ejecutar**:
   ```bash
   rm ./data/prompts.db  # Eliminar la base de datos vacía
   # Reinicia el servicio para que se vuelva a crear
   ```

## Problema: Error de autenticación en el panel de administración

Si no puedes acceder al panel de administración:

### Solución:

1. **Restablece el usuario administrador**:
   ```bash
   sqlite3 ./data/prompts.db "DELETE FROM users WHERE username='admin';"
   ```

2. **El servidor creará automáticamente un nuevo usuario admin con contraseña admin la próxima vez que se inicie**

## Verificación general del sistema

Para un diagnóstico completo, ejecuta:

```bash
bash ./diagnose.sh > diagnostico.txt
cat diagnostico.txt
```

## Contacto de soporte

Si los problemas persisten, proporciona los siguientes archivos al equipo de soporte:

1. Log del servidor: `./data/server.log`
2. Diagnóstico: `./data/diagnostico_pre.log`
3. Resultado del endpoint de diagnóstico
