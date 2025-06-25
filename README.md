# Galería de Prompts AI - Guía de Implementación SEO

Este proyecto es una aplicación web optimizada para SEO que muestra y gestiona una galería de prompts para IA con sus respectivas imágenes generadas. La aplicación incluye visualización en formato masonry responsivo, búsqueda de prompts por texto, filtrado por categorías, y un completo panel de administración.

## Características

- **Galería Masonry:** Diseño adaptativo que se ajusta al tamaño de pantalla
- **Búsqueda y Filtrado:** Buscar prompts por texto o filtrar por categorías
- **Modal Enriquecido:** Visualización detallada con metadatos, categorías y prompts relacionados
- **Funcionalidad de Compartir:** Compartir prompts en redes sociales
- **SEO Optimizado:** Datos estructurados Schema.org, metaetiquetas optimizadas
- **PWA Ready:** Service worker, manifest.json y soporte offline
- **Panel de Administración:** Gestión completa de prompts (CRUD)
- **Base de Datos SQLite:** Almacenamiento persistente de datos
- **API RESTful:** Endpoints para interactuar con la base de datos

## Tecnologías Utilizadas

- **Frontend:** HTML, CSS, JavaScript puro (sin frameworks)
- **Backend:** Node.js, Express
- **Base de Datos:** SQLite3
- **Gestión de Archivos:** Multer para subida de imágenes

## Despliegue en Render.com

Para desplegar esta aplicación en Render.com, sigue estos pasos:

1. **Crea una cuenta** en [Render](https://render.com) si aún no la tienes.

2. **Crea un nuevo Web Service**:
   - Conecta tu repositorio de GitHub
   - Selecciona el repositorio de tu proyecto
   - Elige un nombre para tu servicio

3. **Configura el servicio**:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (o el que prefieras)

4. **Variables de entorno** (opcional):
   - `NODE_ENV`: production
   - `PORT`: 10000 (Render asignará automáticamente el puerto)

5. **Persistencia de datos**:
   - Render proporciona almacenamiento persistente en `/data`
   - Modifica la ruta de la base de datos y directorio de imágenes en `server.js` si es necesario:
   ```javascript
   // Para la base de datos
   const db = new sqlite3.Database(process.env.NODE_ENV === 'production' ? '/data/prompts.db' : './prompts.db');
   
   // Para las imágenes
   const uploadDir = process.env.NODE_ENV === 'production' ? '/data/images/' : 'images/';
   ```

6. **Acceso al panel de administración**:
   - La URL será: `https://tu-app.onrender.com/login.html`
   - Usuario por defecto: `admin`
   - Contraseña por defecto: `admin123`
   - Se recomienda cambiar la contraseña después del primer inicio de sesión

## Estructura del Proyecto

```
├── admin.html           # Página del panel de administración
├── admin.js             # JavaScript para el panel de administración
├── admin.css            # Estilos del panel de administración
├── index.html           # Página principal de la galería
├── scripts.js           # JavaScript principal
├── style.css            # Estilos principales
├── server.js            # Servidor Node.js con Express
├── package.json         # Dependencias del proyecto
├── images/              # Directorio de imágenes
└── prompts.db           # Base de datos SQLite
```

## Instalación y Uso

1. Clona el repositorio
2. Instala las dependencias:
   ```
   npm install
   ```
3. Inicia el servidor:
   ```
   npm start
   ```
4. Accede a la aplicación en tu navegador:
   - Galería: `http://localhost:3000`
   - Administración: `http://localhost:3000/admin`

## Funcionamiento

- La aplicación carga los prompts desde la base de datos SQLite
- Las imágenes se muestran en un layout masonry responsivo
- Puedes buscar prompts por texto en la barra de búsqueda
- Al hacer clic en una imagen, se abre un modal con la imagen ampliada y su prompt
- Desde el panel de administración puedes:
  - Ver todos los prompts existentes
  - Añadir nuevos prompts con imágenes
  - Editar prompts existentes
  - Eliminar prompts

## API Endpoints

- `GET /api/prompts` - Obtener todos los prompts
- `GET /api/prompts/:id` - Obtener un prompt específico
- `POST /api/prompts` - Crear un nuevo prompt
- `PUT /api/prompts/:id` - Actualizar un prompt existente
- `DELETE /api/prompts/:id` - Eliminar un prompt

## Licencia

[MIT](LICENSE)

# Guía de Implementación SEO Paso a Paso

Esta guía detalla el proceso completo para optimizar un sitio web de prompts para IA enfocándose en posicionarlo en los primeros resultados de búsqueda para términos relacionados con "Prompts".

## Índice de Implementación SEO

1. [Fundamentos técnicos SEO](#fundamentos-técnicos-seo)
2. [Optimización On-Page](#optimización-on-page)
3. [Datos estructurados (Schema.org)](#datos-estructurados-schemaorg)
4. [Optimización de rendimiento](#optimización-de-rendimiento)
5. [Contenido enriquecido](#contenido-enriquecido)
6. [Estrategia de enlaces internos](#estrategia-de-enlaces-internos)
7. [Optimización móvil](#optimización-móvil)
8. [Monitorización y mantenimiento](#monitorización-y-mantenimiento)

## Fundamentos técnicos SEO

### Paso 1: Configuración básica de archivos

1. **Crear archivo robots.txt** para guiar a los buscadores:
   ```
   User-agent: *
   Allow: /
   Disallow: /login.html
   Disallow: /admin.html
   
   # Sitemap
   Sitemap: https://tu-dominio.com/sitemap.xml
   ```

2. **Crear sitemap.xml** para indexación eficiente:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>https://tu-dominio.com/</loc>
       <lastmod>2025-06-23</lastmod>
       <changefreq>daily</changefreq>
       <priority>1.0</priority>
     </url>
     <!-- Otras URLs con sus atributos -->
   </urlset>
   ```

3. **Implementar manifest.json** para PWA:
   ```json
   {
     "name": "Prompts AI | Galería de Prompts para Inteligencia Artificial",
     "short_name": "Prompts AI",
     "description": "Colección curada de los mejores prompts para IA",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#000000",
     "theme_color": "#4a90e2",
     "icons": [
       {
         "src": "/assets/icon-192.png",
         "sizes": "192x192",
         "type": "image/png"
       },
       {
         "src": "/assets/icon-512.png",
         "sizes": "512x512",
         "type": "image/png"
       }
     ]
   }
   ```

4. **Configurar Service Worker** para rendimiento y disponibilidad offline:
   ```javascript
   // service-worker.js (implementación básica)
   const CACHE_NAME = 'prompts-ai-cache-v1';
   const urlsToCache = [
     '/',
     '/index.html',
     '/style.css',
     '/scripts.js'
   ];

   // Instalar el service worker
   self.addEventListener('install', event => {
     event.waitUntil(
       caches.open(CACHE_NAME)
         .then(cache => cache.addAll(urlsToCache))
     );
   });

   // Estrategia cache-first para servir recursos
   self.addEventListener('fetch', event => {
     event.respondWith(
       caches.match(event.request)
         .then(response => response || fetch(event.request))
     );
   });
   ```

## Optimización On-Page

### Paso 2: Estructura HTML semántica

1. **Implementar etiquetas HTML5 semánticas**:
   - `<header>` para encabezados
   - `<main>` para contenido principal
   - `<section>` para secciones distintas
   - `<article>` para contenido independiente
   - `<footer>` para pie de página
   - Uso correcto de `<h1>`, `<h2>`, etc., respetando la jerarquía

2. **Optimizar encabezados para SEO**:
   - Un único `<h1>` por página con la palabra clave principal
   - `<h2>` para secciones principales
   - `<h3>` para subsecciones
   - Incluir palabras clave relevantes en los encabezados

### Paso 3: Metadatos optimizados

1. **Metaetiquetas esenciales**:
   - Title: "Prompts AI | Galería de Prompts para IA | Generación de Imágenes"
   - Description: "Colección curada de los mejores prompts para IA. Biblioteca con prompts optimizados para Midjourney, DALL-E y Stable Diffusion."
   - Palabras clave relevantes sin saturación
   - Etiqueta canónica para evitar contenido duplicado

2. **Open Graph y Twitter Cards para compartir en redes sociales**:
   - Título, descripción e imagen específicos para compartir
   - URL canónica
   - Tipo de contenido

## Datos estructurados (Schema.org)

### Paso 4: Implementar marcado JSON-LD

1. **Schema WebSite para el sitio principal**:
   ```javascript
   {
     "@context": "https://schema.org",
     "@type": "WebSite",
     "name": "Prompts AI | Galería de Prompts para IA",
     "url": "https://tu-dominio.com/",
     "potentialAction": {
       "@type": "SearchAction",
       "target": "https://tu-dominio.com/?s={search_term_string}",
       "query-input": "required name=search_term_string"
     }
   }
   ```

2. **Schema CollectionPage para la galería**:
   ```javascript
   {
     "@context": "https://schema.org",
     "@type": "CollectionPage",
     "name": "Galería de Prompts para IA",
     "description": "Colección curada de los mejores prompts para generación con IA",
     "url": "https://tu-dominio.com/"
   }
   ```

3. **Schema ImageObject para cada prompt**:
   ```javascript
   {
     "@context": "https://schema.org",
     "@type": "ImageObject",
     "contentUrl": "https://tu-dominio.com/images/imagen1.jpg",
     "name": "Prompt para paisaje fantástico",
     "description": "Texto completo del prompt...",
     "encodingFormat": "image/jpeg"
   }
   ```

4. **Generación dinámica de esquemas** mediante JavaScript para reflejar el contenido actual.

## Optimización de rendimiento

### Paso 5: Optimización de imágenes y recursos

1. **Implementación de lazy loading** para imágenes:
   ```html
   <img src="imagen.jpg" loading="lazy" alt="Descripción para SEO" />
   ```

2. **Optimización de tamaño y formato de imágenes**:
   - Comprimir imágenes sin pérdida significativa de calidad
   - Usar formatos modernos como WebP con fallback a JPEG
   - Servir imágenes en dimensiones adecuadas

3. **Mejora de Core Web Vitals**:
   - LCP (Largest Contentful Paint): Optimizando carga inicial
   - FID (First Input Delay): Minimizando JavaScript bloqueante
   - CLS (Cumulative Layout Shift): Evitando cambios de layout

4. **Manejo de errores y estados de carga**:
   - Indicadores visuales de carga
   - Imágenes de fallback
   - Manejo de errores elegante

## Contenido enriquecido

### Paso 6: Creación de contenido de valor

1. **Blog con artículos relevantes sobre prompts**:
   - "Cómo escribir prompts efectivos para IA"
   - "Mejores prácticas en prompt engineering"
   - "Guía para generar imágenes con prompts en Midjourney/DALL-E"

2. **Estructura optimizada de artículos**:
   - Introducción con palabras clave principales
   - Tabla de contenidos navegable
   - Subtítulos H2 y H3 con palabras clave secundarias
   - Conclusión con llamado a la acción
   - Más de 1500 palabras de contenido valioso

3. **Elementos multimedia integrados**:
   - Imágenes optimizadas con texto alt relevante
   - Comparativas de prompts antes/después
   - Ejemplos visuales de técnicas

## Estrategia de enlaces internos

### Paso 7: Implementación de enlaces internos

1. **Categorización y filtrado de prompts**:
   - Enlaces a categorías específicas
   - Sistema de etiquetas para relacionar contenido similar
   - Breadcrumbs para navegación y SEO

2. **Enlaces contextuales en contenido**:
   - Enlaces naturales entre artículos relacionados
   - Referencias cruzadas entre blog y galería de prompts

3. **Footer estructurado con enlaces importantes**:
   - Enlaces a categorías principales
   - Enlaces a recursos
   - Enlaces a páginas informativas

## Optimización móvil

### Paso 8: Responsividad y experiencia móvil

1. **Diseño 100% responsive**:
   - Media queries para diferentes breakpoints
   - Elementos táctiles con tamaño adecuado
   - Menú adaptativo para dispositivos móviles

2. **Optimización de tiempos de carga en móvil**:
   - Versiones específicas de imágenes para móvil
   - Eliminación de JavaScript no esencial para móvil
   - Priorización de contenido visible first

3. **Implementación PWA completa**:
   - Service Worker configurado
   - Manifest.json optimizado
   - Experiencia de instalación y uso offline

## Monitorización y mantenimiento

### Paso 9: Herramientas de seguimiento SEO

1. **Configuración de Google Search Console**:
   - Verificar propiedad del sitio
   - Enviar sitemap.xml
   - Monitorear errores de rastreo e indexación

2. **Implementación de Google Analytics**:
   - Configuración de objetivos de conversión
   - Seguimiento de eventos relevantes
   - Análisis de comportamiento de usuario

3. **Monitoreo de Core Web Vitals**:
   - PageSpeed Insights
   - Chrome User Experience Report
   - Lighthouse en Chrome DevTools

### Paso 10: Actualización y mejora continua

1. **Estrategia de contenido periódico**:
   - Publicación regular de nuevos prompts
   - Actualizaciones de artículos existentes
   - Contenido estacional relevante

2. **Revisión de métricas**:
   - Análisis mensual de posiciones en SERPs
   - Revisión de CTR y comportamiento de usuario
   - Identificación de oportunidades de mejora

3. **Adaptación a cambios de algoritmo**:
   - Mantenerse informado sobre actualizaciones
   - Implementar cambios según nuevas directrices

---

## Herramientas recomendadas para SEO

- **Google Search Console**: Monitoreo de indexación y rendimiento en búsquedas
- **Google Analytics**: Análisis de comportamiento de usuario y conversiones
- **Schema Markup Validator**: Validar datos estructurados
- **PageSpeed Insights**: Analizar rendimiento web
- **Mobile-Friendly Test**: Verificar experiencia móvil
- **Screaming Frog**: Auditoría técnica SEO
- **Ahrefs/SEMrush**: Investigación de palabras clave y backlinks

## Cambios Recientes

### Mejoras de Usabilidad y SEO - Junio 2025

1. **Categorías en Base de Datos:**
   - Implementación de tablas para categorías y relaciones en SQLite
   - Migración automática de categorías desde datos existentes
   - API mejorada para devolver prompts con sus categorías

2. **Mejoras Visuales:**
   - Rediseño del header con animaciones y mejor legibilidad
   - Título con efecto gradiente animado
   - Subtítulo mejorado con separador y animación de entrada

3. **Filtros por Categoría:**
   - Rediseño de filtros con mejor contraste y feedback visual
   - Indicador visual de filtros activos
   - Integración completa con el sistema de búsqueda

4. **Optimización de Imágenes:**
   - Normalización de rutas de imágenes
   - Manejo robusto de errores en carga de imágenes
   - Lazy loading para mejor rendimiento

5. **Metadatos Enriquecidos:**
   - Mejoras en visualización de categorías en el modal
   - Título dinámico basado en el contenido del prompt
   - Categorías adicionales como badges en el modal

Estos cambios mejoran significativamente la experiencia de usuario, el SEO y el rendimiento de la aplicación, manteniendo la coherencia visual y la accesibilidad.

## Conclusión

La implementación SEO es un proceso continuo que requiere atención constante y mejoras incrementales. Esta guía proporciona los fundamentos para optimizar un sitio web de prompts para IA con el objetivo de posicionarlo en los primeros resultados de búsqueda para términos relacionados con "Prompts".

## Diagnóstico y Solución de Problemas

Si tienes problemas con el despliegue en Render, especialmente relacionados con la carga inicial de datos o imágenes, puedes usar las siguientes herramientas de diagnóstico:

### Endpoint de Diagnóstico

La aplicación incluye un endpoint especial para verificar el estado de la base de datos y archivos. Accede a:

```
https://tu-dominio.onrender.com/api/diagnostics
```

> En producción, este endpoint solo es accesible si estás autenticado como administrador.

### Logs de Diagnóstico

Los scripts de inicio y diagnóstico generan logs detallados que puedes revisar:

- **Log del servidor:** `/data/server.log`
- **Log de diagnóstico pre-inicio:** `/data/diagnostico_pre.log`

Puedes acceder a estos logs desde la sección "Logs" del panel de control de Render.

### Inicialización de Datos

La aplicación está configurada para cargar automáticamente datos de ejemplo desde `defaultData.js` cuando la base de datos está vacía. Esto garantiza que siempre haya contenido disponible después de un despliegue, incluso si el volumen persistente está vacío.

Para añadir o modificar estos datos de ejemplo, edita el archivo `defaultData.js` en la raíz del proyecto.

### Problemas Comunes y Soluciones

1. **Imágenes no visibles:** Verifica que las imágenes se han copiado correctamente al directorio `/data/images/`. El script `start.sh` intenta copiar las imágenes automáticamente.

2. **Base de datos vacía:** La aplicación inicializará automáticamente la base de datos con datos de ejemplo. Verifica los logs para asegurarte de que este proceso completó correctamente.

3. **Error de permisos:** Si ves errores relacionados con permisos, verifica los logs de diagnóstico y asegúrate de que los directorios `/data` y `/data/images` tienen los permisos correctos.

4. **Cambios en estructura de datos:** Si modificas la estructura de la base de datos, asegúrate de actualizar todas las consultas SQL en `server.js` y la función `importInitialData()`.
