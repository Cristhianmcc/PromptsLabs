// Array para almacenar los datos de los prompts cargados desde la API
let promptsData = [];
let activeFilters = new Set(); // Para almacenar categorías filtradas activas

// Función para cargar los prompts desde la API
function loadPromptsFromAPI() {
  console.log('Cargando prompts desde API...');
  fetch('/api/prompts')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar los prompts');
      }
      return response.json();
    })
    .then(data => {
      promptsData = data;
      console.log(`Prompts cargados: ${data.length}`);
      
      // Verificar los datos recibidos
      if (data.length > 0) {
        console.log('Ejemplo de primer prompt:', JSON.stringify(data[0]));
      } else {
        console.warn('No se recibieron prompts de la API');
      }
      
      // Primero inicializar las columnas
      initializeColumns();
      
      // Luego cargar las categorías
      loadCategories(); 
      
      // Finalmente crear los elementos de la galería
      createGalleryItems();
      
      // Asegurar que el layout se actualice si hay cambios en la ventana
      window.addEventListener('resize', () => {
        setTimeout(recalculateLayout, 200);
      });
    })
    .catch(error => {
      console.error('Error:', error);
      // Mostrar mensaje de error en la interfaz
      const gallery = document.getElementById("gallery");
      gallery.innerHTML = `
        <div class="error-message">
          <p>Error al cargar las imágenes. Por favor, intenta de nuevo más tarde.</p>
          <p>Detalles: ${error.message}</p>
        </div>
      `;
    });
}

let columns = 4
let columnHeights = []
let columnWidth = 0
const gap = 20

// Función para determinar el número de columnas según el ancho de pantalla
function getColumnCount() {
  const width = window.innerWidth
  if (width <= 480) return 1
  if (width <= 768) return 2
  if (width <= 1200) return 3
  return 4
}

// Función para inicializar las columnas
function initializeColumns() {
  columns = getColumnCount()
  const gallery = document.getElementById("gallery")
  const containerWidth = gallery.offsetWidth
  columnWidth = (containerWidth - gap * (columns - 1)) / columns
  columnHeights = new Array(columns).fill(0)
}

// Función para extraer categorías únicas de los prompts
function loadCategories() {
  if (!promptsData.length) return;
  
  const categoryContainer = document.getElementById("categoryFilters");
  if (!categoryContainer) return;
  
  // Limpiar el contenedor
  categoryContainer.innerHTML = '';
  
  // Obtener categorías únicas
  const categories = new Set();
  promptsData.forEach(item => {
    if (item.categories && item.categories.length) {
      item.categories.forEach(cat => categories.add(cat.trim()));
    }
  });
  
  // Crear los filtros de categoría
  categories.forEach(category => {
    const categoryBadge = document.createElement("div");
    categoryBadge.className = "category-filter";
    categoryBadge.textContent = category;
    categoryBadge.setAttribute("data-category", category);
    categoryBadge.onclick = () => toggleCategoryFilter(category, categoryBadge);
    
    categoryContainer.appendChild(categoryBadge);
  });
}

// Función para activar/desactivar un filtro de categoría
function toggleCategoryFilter(category, element) {
  if (activeFilters.has(category)) {
    activeFilters.delete(category);
    element.classList.remove("active");
  } else {
    activeFilters.add(category);
    element.classList.add("active");
  }
  
  // Actualizar la galería con los filtros aplicados
  filterGallery();
}

// Función para aplicar filtros a la galería
function filterGallery() {
  const searchTerm = document.querySelector(".search-input")?.value.toLowerCase() || "";
  const hasActiveFilters = activeFilters.size > 0;
  
  // Reconstruir la galería
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = '';
  columnHeights = new Array(columns).fill(0);
  
  let matchCount = 0;
  
  promptsData.forEach((item, index) => {
    const prompt = item.prompt.toLowerCase();
    let matchesSearch = prompt.includes(searchTerm);
    let matchesCategory = true;
    
    // Verificar si cumple con los filtros de categoría activos
    if (hasActiveFilters && item.categories) {
      matchesCategory = Array.from(activeFilters).some(filter => 
        item.categories.some(cat => cat.trim().toLowerCase() === filter.toLowerCase())
      );
    }
    
    // Solo mostrar si cumple con la búsqueda y las categorías
    if (matchesSearch && matchesCategory) {
      matchCount++;
      const galleryItem = createGalleryItem(item, index);
      gallery.appendChild(galleryItem);
    }
  });
  
  // Mostrar mensaje si no hay resultados
  if (matchCount === 0) {
    gallery.innerHTML = `
      <div class="info-message">
        <p>No se encontraron prompts que coincidan con tu búsqueda.</p>
        <p>Intenta con otros términos o elimina algunos filtros.</p>
      </div>
    `;
  }
  
  // Actualizar la altura del contenedor
  updateGalleryHeight();
  
  console.log(`Filtrado completado: ${matchCount} coincidencias de ${promptsData.length} prompts`);
}

// Función para crear elementos de la galería
function createGalleryItems() {
  const gallery = document.getElementById("gallery");
  
  // Limpiar galería existente
  gallery.innerHTML = '';
  columnHeights = new Array(columns).fill(0);
  
  // Verificar si hay datos para mostrar
  if (!promptsData || promptsData.length === 0) {
    console.log("No hay prompts para mostrar");
    gallery.innerHTML = `
      <div class="info-message">
        <p>No se encontraron prompts para mostrar.</p>
      </div>
    `;
    return;
  }
  
  console.log(`Creando ${promptsData.length} elementos de galería`);
  
  // Crear fragmento para mejorar rendimiento
  const fragment = document.createDocumentFragment();
  
  promptsData.forEach((item, index) => {
    const galleryItem = createGalleryItem(item, index);
    fragment.appendChild(galleryItem);
  });
  
  // Añadir todos los elementos a la vez
  gallery.appendChild(fragment);
  
  // Actualizar altura de la galería
  updateGalleryHeight();
  
  // Programar otra actualización después de que las imágenes puedan haberse cargado
  setTimeout(() => {
    updateGalleryHeight();
    logImageDebugInfo();
  }, 1000);
}

// Función para crear un elemento de galería individual
function createGalleryItem(item, index) {
  const galleryItem = document.createElement("div");
  galleryItem.className = "gallery-item";
  galleryItem.onclick = () => openModal(index);

  const img = document.createElement("img");
  img.src = ensureCorrectImagePath(item.image);
  img.alt = item.prompt ? `Prompt: ${item.prompt.substring(0, 50)}...` : `Prompt ${index + 1}`;
  img.loading = "lazy";  // Cuando la imagen carga, posicionarla en el masonry
  img.onload = () => {
    positionItem(galleryItem, img);
    console.log(`Imagen cargada correctamente: ${img.src} (${img.naturalWidth}x${img.naturalHeight})`);
  };
    // Manejar errores de carga de imágenes
  img.onerror = () => {
    console.error(`Error al cargar la imagen: ${img.src}`);
    // Usar una imagen de respaldo y registrar el error para depuración
    const originalSrc = img.src;
    img.src = '/images/placeholder.jpg';
    img.alt = 'Imagen no disponible';
    console.log(`Sustituyendo imagen ${originalSrc} por placeholder`);
    
    // Intentar posicionar el item incluso con la imagen de fallback
    setTimeout(() => {
      positionItem(galleryItem, img);
    }, 100);
  };

  galleryItem.appendChild(img);
  
  // Añadir badges de categoría si existen
  if (item.categories && item.categories.length) {
    const categoryContainer = document.createElement("div");
    categoryContainer.className = "item-categories";
    
    item.categories.forEach(category => {
      const badge = document.createElement("span");
      badge.className = "category-badge";
      badge.textContent = category.trim();
      categoryContainer.appendChild(badge);
    });
    
    galleryItem.appendChild(categoryContainer);
  }
  
  return galleryItem;
}

// Función para asegurar que la ruta de la imagen sea correcta
function ensureCorrectImagePath(imagePath) {
  // Si no hay ruta de imagen o está vacía, usar placeholder
  if (!imagePath || imagePath.trim() === '') {
    console.log("No hay ruta de imagen, usando placeholder");
    return '/images/placeholder.jpg';
  }
  
  let processedPath = imagePath;
  console.log(`Procesando ruta de imagen: "${processedPath}"`);
  
  // Si ya tiene la ruta completa con http, devolverla
  if (processedPath.startsWith('http')) {
    console.log(`Ruta externa (http): ${processedPath}`);
    return processedPath;
  }
  
  // Si ya viene con la ruta correcta desde el servidor (/images/...), usarla directamente
  if (processedPath.startsWith('/images/')) {
    console.log(`Ruta correcta del servidor: ${processedPath}`);
    return processedPath;
  }
  
  // Si ya tiene 'images/' al inicio (sin barra), agregarle la barra
  if (processedPath.startsWith('images/')) {
    const finalPath = `/${processedPath}`;
    console.log(`Agregando barra inicial: ${finalPath}`);
    return finalPath;
  }
  
  // Verificar si es solo un nombre de archivo (sin directorios)
  if (!processedPath.includes('/') && !processedPath.includes('\\')) {
    const finalPath = `/images/${processedPath}`;
    console.log(`Nombre de archivo simple, añadiendo directorio: ${finalPath}`);
    return finalPath;
  }
  
  // Verificar si es una ruta relativa de data/images
  if (processedPath.startsWith('data/images/')) {
    const finalPath = `/${processedPath.substring(5)}`; // Quitar 'data/' del inicio
    console.log(`Convertida ruta data/images a /images: ${finalPath}`);
    return finalPath;
  }
  
  // Para cualquier otro caso, añadir el prefijo '/images/'
  const finalPath = `/images/${processedPath}`;
  console.log(`Ruta final normalizada: ${finalPath}`);
  return finalPath;
}

// Función para posicionar un elemento en el layout masonry
function positionItem(item, img) {
  // Encontrar la columna más corta
  const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

  // Calcular posición
  const x = shortestColumnIndex * (columnWidth + gap);
  const y = columnHeights[shortestColumnIndex];

  // Calcular altura proporcional de la imagen
  const aspectRatio = img.naturalHeight / img.naturalWidth;
  const itemHeight = columnWidth * aspectRatio;

  // Posicionar el elemento
  item.style.left = `${x}px`;
  item.style.top = `${y}px`;
  item.style.width = `${columnWidth}px`;

  // Actualizar la altura de la columna
  columnHeights[shortestColumnIndex] += itemHeight + gap;

  // Actualizar la altura del contenedor
  updateGalleryHeight();
}

// Función para recalcular todo el layout
function recalculateLayout() {
  // Reinicializar columnas con el nuevo ancho de ventana
  const oldColumns = columns;
  initializeColumns();
  
  // Solo continuar si el número de columnas ha cambiado o se fuerza el recálculo
  if (oldColumns === columns && arguments.length === 0) {
    return;
  }
  
  console.log(`Recalculando layout: ${oldColumns} columnas -> ${columns} columnas`);
  
  // Reiniciar alturas de columnas
  columnHeights = new Array(columns).fill(0);
  
  // Obtener todos los items de galería actuales
  const items = document.querySelectorAll(".gallery-item");
  console.log(`Recalculando layout para ${items.length} elementos`);
  
  // Reposicionar cada item
  items.forEach((item) => {
    const img = item.querySelector("img");
    if (img && img.complete && img.naturalWidth > 0) {
      positionItem(item, img);
    } else if (img) {
      // Si la imagen aún no se ha cargado, configurar un onload
      img.onload = () => positionItem(item, img);
    }
  });
  
  // Asegurar que la altura de la galería se actualice
  updateGalleryHeight();
}

// Función para abrir el modal
function openModal(index) {
  const modal = document.getElementById("modal");
  const modalImage = document.getElementById("modalImage");
  const promptText = document.getElementById("promptText");
  const promptTitle = document.getElementById("promptTitle");
  const promptCategory = document.getElementById("promptCategory");
  const item = promptsData[index];

  modalImage.src = ensureCorrectImagePath(item.image);
  promptText.textContent = item.prompt;
  
  // Añadir un título más descriptivo basado en el contenido del prompt
  const shortPrompt = item.prompt.substring(0, 40);
  promptTitle.textContent = `✨ ${shortPrompt}...`;
  
  // Mostrar la categoría principal en el elemento de categoría
  if (item.categories && item.categories.length) {
    promptCategory.textContent = item.categories[0];
    promptCategory.style.display = 'inline-block';
  } else {
    promptCategory.textContent = 'General';
    promptCategory.style.display = 'inline-block';
  }
  
  // Añadir todas las categorías al contenedor de metadatos
  const promptMetadata = document.querySelector(".prompt-metadata");
  if (promptMetadata) {
    // Limpiar badges existentes (excepto la primera categoría y el modelo)
    const badges = promptMetadata.querySelectorAll(".category-badge");
    badges.forEach(badge => badge.remove());
    
    // Añadir badges para cada categoría adicional
    if (item.categories && item.categories.length > 1) {
      for(let i = 1; i < item.categories.length; i++) {
        const badge = document.createElement("span");
        badge.className = "category-badge modal-category";
        badge.textContent = item.categories[i].trim();
        promptMetadata.appendChild(badge);
      }
    }
  }
  
  // Mostrar prompts relacionados si existen
  showRelatedPrompts(index);
  
  // Actualizar metadatos dinámicos
  updateDynamicMetaTags(item);
  
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
}

// Función para mostrar prompts relacionados
function showRelatedPrompts(currentIndex) {
  const relatedContainer = document.getElementById("relatedPrompts");
  if (!relatedContainer) return;
  
  relatedContainer.innerHTML = '';
  
  const currentPrompt = promptsData[currentIndex];
  if (!currentPrompt.categories || !currentPrompt.categories.length) return;
  
  // Encontrar prompts con categorías similares
  const related = promptsData
    .filter((item, idx) => {
      if (idx === currentIndex) return false; // Excluir el prompt actual
      if (!item.categories || !item.categories.length) return false;
      
      // Verificar si comparten al menos una categoría
      return item.categories.some(cat => 
        currentPrompt.categories.includes(cat)
      );
    })
    .slice(0, 3); // Limitar a 3 prompts relacionados
  
  if (related.length === 0) {
    relatedContainer.style.display = 'none';
    return;
  }
  
  // Crear elementos para prompts relacionados
  related.forEach((item, idx) => {
    const relatedItem = document.createElement("div");
    relatedItem.className = "related-prompt";
    relatedItem.onclick = () => {
      // Encontrar el índice en el array original
      const originalIndex = promptsData.findIndex(p => p.id === item.id);
      if (originalIndex !== -1) {
        openModal(originalIndex);
      }
    };
    
    const img = document.createElement("img");
    img.src = ensureCorrectImagePath(item.image);
    img.alt = item.prompt ? item.prompt.substring(0, 30) : "Prompt relacionado";
    
    relatedItem.appendChild(img);
    relatedContainer.appendChild(relatedItem);
  });
  
  // Mostrar la sección
  document.querySelector(".related-prompts-section").style.display = 'block';
}

// Función para actualizar metadatos dinámicos
function updateDynamicMetaTags(prompt) {
  // Actualizar Open Graph y Twitter Card para el prompt actual
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDesc = document.querySelector('meta[name="twitter:description"]');
  
  if (ogTitle && prompt.prompt) {
    ogTitle.setAttribute('content', `Prompt: ${prompt.prompt.substring(0, 60)}... | Prompts AI`);
  }
  
  if (ogDesc && prompt.prompt) {
    ogDesc.setAttribute('content', `${prompt.prompt.substring(0, 150)}...`);
  }
  
  if (twitterTitle && prompt.prompt) {
    twitterTitle.setAttribute('content', `Prompt: ${prompt.prompt.substring(0, 60)}... | Prompts AI`);
  }
  
  if (twitterDesc && prompt.prompt) {
    twitterDesc.setAttribute('content', `${prompt.prompt.substring(0, 150)}...`);
  }
}

// Función para copiar el prompt
function copyPrompt() {
  const promptText = document.getElementById("promptText").textContent;
  navigator.clipboard
    .writeText(promptText)
    .then(() => {
      const copyBtn = document.getElementById("copyBtn");
      const originalText = copyBtn.innerHTML;

      copyBtn.innerHTML = "✅ ¡Copiado!";
      copyBtn.classList.add("copied");

      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove("copied");
      }, 2500);
    })
    .catch((err) => {
      console.error("Error al copiar: ", err);
      const copyBtn = document.getElementById("copyBtn");
      copyBtn.innerHTML = "❌ Error al copiar";
      setTimeout(() => {
        copyBtn.innerHTML = "📋 Copiar Prompt";
      }, 2000);
    });
}

// Función para copiar el prompt al portapapeles
function copyPromptToClipboard() {
  const promptText = document.getElementById("promptText");
  if (!promptText) return;
  
  // Crear un elemento textarea temporal para copiar el texto
  const textarea = document.createElement("textarea");
  textarea.value = promptText.textContent;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  
  // Seleccionar y copiar
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  
  // Mostrar feedback
  const copyBtn = document.getElementById("copyBtn");
  const originalText = copyBtn.innerHTML;
  copyBtn.innerHTML = "✅ ¡Copiado!";
  
  // Restaurar texto original después de 2 segundos
  setTimeout(() => {
    copyBtn.innerHTML = originalText;
  }, 2000);
}

// Funciones para compartir en redes sociales
function shareOnTwitter() {
  const promptText = document.getElementById("promptText")?.textContent.substring(0, 100) + "...";
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(`Mira este prompt para IA: "${promptText}"`);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
}

function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
}

function shareOnPinterest() {
  const url = encodeURIComponent(window.location.href);
  const media = encodeURIComponent(document.getElementById("modalImage")?.src || "");
  const description = encodeURIComponent(document.getElementById("promptText")?.textContent || "");
  window.open(`https://pinterest.com/pin/create/button/?url=${url}&media=${media}&description=${description}`, "_blank");
}

// Función para compartir en redes sociales
function sharePrompt(platform) {
  const promptText = document.getElementById("promptText").textContent;
  const currentUrl = window.location.href;
  let shareUrl = '';
  
  switch(platform) {
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Mira este prompt para IA: ')}&url=${encodeURIComponent(currentUrl)}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
      break;
    case 'whatsapp':
      shareUrl = `https://wa.me/?text=${encodeURIComponent('Mira este prompt para IA: ' + promptText + ' ' + currentUrl)}`;
      break;
    default:
      return;
  }
  
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

// Función para cerrar el modal
function closeModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

// Función de depuración para registrar información sobre la carga de imágenes
function logImageDebugInfo() {
  console.log("------- DEBUG: ESTADO DE CARGA DE IMÁGENES -------");
  console.log(`Prompts cargados: ${promptsData.length}`);
  console.log(`Número de columnas: ${columns}`);
  console.log(`Ancho de columna: ${columnWidth}px`);
  console.log(`Alturas de columnas:`, columnHeights);
  
  const gallery = document.getElementById("gallery");
  console.log(`Altura actual de la galería: ${gallery.style.height}`);
  
  const loadedImages = document.querySelectorAll(".gallery-item img");
  console.log(`Imágenes en el DOM: ${loadedImages.length}`);
  
  let loadedCount = 0;
  let errorCount = 0;
  
  loadedImages.forEach((img, i) => {
    if (img.complete) {
      loadedCount++;
      if (img.naturalWidth === 0) {
        errorCount++;
        console.log(`Imagen ${i}: ERROR - Imagen cargada pero con ancho 0`, img.src);
      } else {
        console.log(`Imagen ${i}: OK - ${img.naturalWidth}x${img.naturalHeight}`, img.src);
      }
    } else {
      console.log(`Imagen ${i}: Pendiente de carga`, img.src);
    }
  });
  
  console.log(`Imágenes cargadas: ${loadedCount}/${loadedImages.length}`);
  console.log(`Imágenes con error: ${errorCount}`);
  
  // Verificar rutas de imágenes en los datos
  console.log("\n------- RUTAS DE IMÁGENES EN LOS DATOS -------");
  promptsData.slice(0, 10).forEach((item, i) => {
    console.log(`Prompt ${i}: Ruta original '${item.image}' -> Procesada '${ensureCorrectImagePath(item.image)}'`);
  });
  
  console.log("------- FIN DEBUG -------");
}

// Función para actualizar la altura de la galería
function updateGalleryHeight() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  
  // Calcular la altura máxima de las columnas + un margen
  const maxHeight = Math.max(...columnHeights, 100);
  gallery.style.height = `${maxHeight}px`;
  
  console.log(`Altura de galería actualizada a ${maxHeight}px`);
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeColumns();
  
  // Cargar prompts desde la API
  loadPromptsFromAPI();

  // Cerrar modal
  document.getElementById("closeModal").onclick = closeModal;
  document.getElementById("modal").onclick = (e) => {
    if (e.target.id === "modal") {
      closeModal();
    }
  };

  // Copiar prompt
  document.getElementById("copyBtn").onclick = copyPrompt;

  // Botones de compartir
  const shareButtons = document.querySelectorAll('.share-btn');
  shareButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const platform = btn.getAttribute('data-platform');
      sharePrompt(platform);
    });
  });

  // Cerrar modal con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });

  // Recalcular layout cuando cambie el tamaño de ventana
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      recalculateLayout();
    }, 250);
  });

  // Funcionalidad de búsqueda
  const searchInput = document.querySelector(".search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterGallery();
    });
  }
});

// Inicialización cuando el documento está listo
document.addEventListener('DOMContentLoaded', () => {
  // Cargar prompts desde la API
  loadPromptsFromAPI();
  
  // Configurar listener para la búsqueda
  const searchInput = document.getElementById("prompt-search");
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterGallery();
    });
  }
  
  // Configurar listener para cerrar el modal
  const closeModal = document.getElementById("closeModal");
  const modal = document.getElementById("modal");
  
  if (closeModal && modal) {
    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    });
    
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });
  }
  
  // Configurar el botón de copiar prompt
  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyPromptToClipboard);
  }
  
  // Configurar botones de compartir
  const shareTwitter = document.getElementById("shareTwitter");
  const shareFacebook = document.getElementById("shareFacebook");
  const sharePinterest = document.getElementById("sharePinterest");
  
  if (shareTwitter) shareTwitter.addEventListener("click", () => shareOnTwitter());
  if (shareFacebook) shareFacebook.addEventListener("click", () => shareOnFacebook());
  if (sharePinterest) sharePinterest.addEventListener("click", () => shareOnPinterest());
  
  // Ejecutar debug después de 3 segundos
  setTimeout(logImageDebugInfo, 3000);
});

// Agregar un listener específico para verificar y corregir problemas de carga de imágenes
document.addEventListener('DOMContentLoaded', () => {
  // Verificar después de 2 segundos que todas las imágenes se cargaron correctamente
  setTimeout(() => {
    const allImages = document.querySelectorAll('.gallery-item img');
    console.log(`Verificando ${allImages.length} imágenes en la galería...`);
    
    allImages.forEach((img, index) => {
      // Si la imagen tiene error o no se ha cargado completamente
      if (!img.complete || img.naturalWidth === 0) {
        console.warn(`Problema con imagen #${index}: ${img.src} - Intentando recargar`);
        
        // Guardar la URL original para referencia
        const originalSrc = img.src;
        
        // Intentar recargar con un timestamp para evitar caché
        img.src = `${originalSrc}?t=${Date.now()}`;
        
        // Si aún hay error, usar el placeholder
        img.onerror = () => {
          console.error(`No se pudo recargar imagen: ${originalSrc}`);
          img.src = '/images/placeholder.jpg';
          
          // Reposicionar el elemento en el masonry
          const galleryItem = img.closest('.gallery-item');
          if (galleryItem) {
            setTimeout(() => positionItem(galleryItem, img), 100);
          }
        };
        
        // Si se carga correctamente en el segundo intento
        img.onload = () => {
          console.log(`Imagen recargada con éxito: ${img.src}`);
          
          // Reposicionar el elemento en el masonry
          const galleryItem = img.closest('.gallery-item');
          if (galleryItem) {
            positionItem(galleryItem, img);
          }
        };
      }
    });
    
    // Recalcular el layout para asegurar que todo está correctamente posicionado
    recalculateLayout(true);
  }, 2000);
});
