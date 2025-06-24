// Array para almacenar los datos de los prompts cargados desde la API
let promptsData = [];

// Función para cargar los prompts desde la API
function loadPromptsFromAPI() {
  fetch('/api/prompts')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar los prompts');
      }
      return response.json();
    })
    .then(data => {
      promptsData = data;
      console.log("Prompts cargados:", promptsData.length);
      createGalleryItems();
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

// Función para normalizar la ruta de la imagen
function normalizeImagePath(imagePath) {
  // Si la ruta ya empieza con /images/, no la modificamos
  if (imagePath.startsWith('/images/')) {
    return imagePath;
  }
  
  // Si la ruta contiene una URL completa, extraemos solo el nombre del archivo
  if (imagePath.includes('http://') || imagePath.includes('https://')) {
    const fileName = imagePath.split('/').pop();
    return `/images/${fileName}`;
  }
  
  // Para rutas relativas o absolutas, extraemos solo el nombre del archivo
  const fileName = imagePath.replace(/^.*[\\\/]/, '');
  return `/images/${fileName}`;
}

// Función para crear elementos de la galería
function createGalleryItems() {
  const gallery = document.getElementById("gallery")
  
  // Limpiar galería existente
  gallery.innerHTML = '';
  
  // Inicializar las columnas antes de crear los elementos
  initializeColumns();
  
  promptsData.forEach((item, index) => {
    const galleryItem = document.createElement("div")
    galleryItem.className = "gallery-item"
    galleryItem.onclick = () => openModal(index)
    
    const img = document.createElement("img")    
    // Normalizar la ruta de la imagen
    const imagePath = normalizeImagePath(item.image);
    
    console.log("Cargando imagen:", imagePath, "Original:", item.image);
    img.src = imagePath;
    img.alt = `Prompt IA: ${item.prompt.substring(0, 40)}...`;
    img.loading = "lazy";
    img.setAttribute('data-prompt-index', index);
    
    // Add structured data attributes for better SEO
    galleryItem.setAttribute('itemscope', '');
    galleryItem.setAttribute('itemtype', 'https://schema.org/ImageObject');
    
    // Add hidden metadata for SEO
    const hiddenTitle = document.createElement('span');
    hiddenTitle.className = 'visually-hidden';
    hiddenTitle.setAttribute('itemprop', 'name');
    hiddenTitle.textContent = `Prompt AI Image ${index + 1}`;
    
    const hiddenDesc = document.createElement('span');
    hiddenDesc.className = 'visually-hidden';
    hiddenDesc.setAttribute('itemprop', 'description');
    hiddenDesc.textContent = item.prompt.substring(0, 100);
    
    // Manejar errores de carga de imagen
    img.onerror = () => {
      console.error("Error al cargar la imagen:", imagePath);
      
      // Intenta cargar la imagen con el nombre de archivo plano
      const justFileName = item.image.replace(/^.*[\\\/]/, '');
      img.src = `/images/${justFileName}`;
      
      // Si la segunda alternativa también falla, muestra un placeholder
      img.onerror = () => {
        console.error("Fallback también falló para:", justFileName);
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'%3E%3Cpath fill='%23aaa' d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";
      };
    }

    // Enhanced image loading with visual feedback
    img.onload = () => {
      img.classList.add('loaded');
      positionItem(galleryItem, img);
    }

    galleryItem.appendChild(img);
    galleryItem.appendChild(hiddenTitle);    galleryItem.appendChild(hiddenDesc);
    gallery.appendChild(galleryItem);
  });
  // Generate schema.org metadata after gallery is created
  generateImageMetadata();
}

// Función para posicionar un elemento en el layout masonry
function positionItem(item, img) {
  // Encontrar la columna más corta
  const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))

  // Calcular posición
  const x = shortestColumnIndex * (columnWidth + gap)
  const y = columnHeights[shortestColumnIndex]

  // Calcular altura proporcional de la imagen
  const aspectRatio = img.naturalHeight / img.naturalWidth
  const itemHeight = columnWidth * aspectRatio

  // Posicionar el elemento
  item.style.left = `${x}px`
  item.style.top = `${y}px`
  item.style.width = `${columnWidth}px`

  // Actualizar la altura de la columna
  columnHeights[shortestColumnIndex] += itemHeight + gap

  // Actualizar la altura del contenedor
  const maxHeight = Math.max(...columnHeights)
  document.getElementById("gallery").style.height = `${maxHeight}px`
}

// Función para recalcular todo el layout
function recalculateLayout() {
  console.log("Recalculando layout masonry...");
  initializeColumns();
  
  // Resetear las alturas de las columnas
  columnHeights = new Array(columns).fill(0);
  
  const items = document.querySelectorAll(".gallery-item");
  console.log(`Encontrados ${items.length} elementos para posicionar`);

  items.forEach((item, index) => {
    const img = item.querySelector("img");
    if (img.complete) {
      positionItem(item, img);
    } else {
      // Si la imagen aún no está cargada, añadir un evento para cuando termine de cargar
      img.onload = () => {
        positionItem(item, img);
      };
    }
  });
  
  // Asegurar que el contenedor tenga la altura correcta
  const maxHeight = Math.max(...columnHeights, 100);
  document.getElementById("gallery").style.height = `${maxHeight}px`;
}

// Función para abrir el modal
function openModal(index) {
  const modal = document.getElementById("modal")
  const modalImage = document.getElementById("modalImage")
  const promptText = document.getElementById("promptText")  
  const promptTitle = document.getElementById("promptTitle")
  
  // Normalizar la ruta de la imagen usando nuestra función
  const imagePath = normalizeImagePath(promptsData[index].image);
  
  console.log("Abriendo imagen en modal:", imagePath, "Original:", promptsData[index].image);
  modalImage.src = imagePath;
    // Manejar error de carga de imagen en el modal
  modalImage.onerror = () => {
    console.error("Error al cargar la imagen en modal:", imagePath);
    
    // Intento con el nombre de archivo plano
    const justFileName = promptsData[index].image.replace(/^.*[\\\/]/, '');
    modalImage.src = `/images/${justFileName}`;
    
    // Si todavía falla, muestra un placeholder
    modalImage.onerror = () => {
      console.error("Fallback también falló en modal para:", justFileName);
      modalImage.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24'%3E%3Cpath fill='%23aaa' d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E";
    };
    };
    };
  }
  
  // Generate dynamic title based on prompt content
  const promptStart = promptsData[index].prompt.split(' ').slice(0, 4).join(' ');
  promptTitle.textContent = `✨ ${promptStart}...`;
  
  // Ensure prompt text is properly displayed and formatted
  promptText.textContent = promptsData[index].prompt;

  // Update metadata for the prompt (categories, model)
  updatePromptMetadata(index);
  
  // Generate and display related prompts
  generateRelatedPrompts(index);
  
  // Set page title and description for better SEO when sharing
  const originalTitle = document.title;
  const originalDescription = document.querySelector('meta[name="description"]').getAttribute('content');
  
  // Update meta tags temporarily for better sharing
  document.title = `Prompt AI: ${promptStart}... | Galería de Prompts para IA`;
  document.querySelector('meta[name="description"]').setAttribute('content', 
    `${promptsData[index].prompt.substring(0, 150)}... | Galería de los mejores prompts para IA.`);
  
  modal.style.display = "block";
  document.body.style.overflow = "hidden";
  
  // Configure sharing buttons
  setupSharingButtons(index, promptStart);
  
  // Reset meta tags when modal closes
  document.getElementById("closeModal").onclick = () => {
    closeModal();
    document.title = originalTitle;
    document.querySelector('meta[name="description"]').setAttribute('content', originalDescription);
  };
}

// Función para cerrar el modal
function closeModal() {
  const modal = document.getElementById("modal")
  modal.style.display = "none"
  document.body.style.overflow = "auto"
}

// Función para copiar el prompt
function copyPrompt() {
  const promptText = document.getElementById("promptText").textContent
  
  // Try alternative methods if clipboard API fails
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(promptText)
      .then(showCopySuccess)
      .catch((err) => {
        console.error("Error al copiar con Clipboard API: ", err)
        fallbackCopyPrompt(promptText)
      })
  } else {
    // Fallback for older browsers or non-secure contexts
    fallbackCopyPrompt(promptText)
  }
}

// Fallback copy method using text area
function fallbackCopyPrompt(text) {
  try {
    // Create a temporary textarea
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    textArea.style.top = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    // Execute copy command
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    if (success) {
      showCopySuccess()
    } else {
      showCopyError()
    }
  } catch (err) {
    console.error("Error al copiar con método fallback: ", err)
    showCopyError()
  }
}

// Show success message
function showCopySuccess() {
  const copyBtn = document.getElementById("copyBtn")
  const originalText = copyBtn.innerHTML

  copyBtn.innerHTML = "✅ ¡Copiado!"
  copyBtn.classList.add("copied")

  setTimeout(() => {
    copyBtn.innerHTML = originalText
    copyBtn.classList.remove("copied")
  }, 2500)
}

// Show error message
function showCopyError() {
  const copyBtn = document.getElementById("copyBtn")
  copyBtn.innerHTML = "❌ Error al copiar"
  setTimeout(() => {
    copyBtn.innerHTML = "📋 Copiar Prompt"  }, 2000)
}

// Enhanced SEO Functions

// Function to generate image metadata
function generateImageMetadata() {
  // Create schema.org JSON-LD for the gallery
  if (promptsData.length > 0) {
    const gallerySchema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "numberOfItems": promptsData.length,
      "itemListElement": promptsData.map((item, index) => {
        const fileName = item.image.replace(/^.*[\\\/]/, '');
        const imagePath = '/images/' + fileName;
        
        return {
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "ImageObject",
            "contentUrl": window.location.origin + imagePath,
            "name": `Prompt AI Image ${index + 1}`,
            "description": item.prompt.substring(0, 100) + (item.prompt.length > 100 ? "..." : "")
          }
        };
      })
    };
    
    // Add the schema to the page
    let script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(gallerySchema);
    document.head.appendChild(script);
  }
}

// Function to generate related prompts for a specific prompt
function generateRelatedPrompts(currentIndex) {
  const relatedContainer = document.getElementById("relatedPromptsContainer");
  relatedContainer.innerHTML = '';
  
  // Get random 3-4 prompts excluding the current one
  const numRelated = Math.min(promptsData.length - 1, Math.floor(Math.random() * 2) + 3); // 3-4 related prompts
  const usedIndices = new Set([currentIndex]);
  
  for (let i = 0; i < numRelated; i++) {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * promptsData.length);
    } while (usedIndices.has(randomIndex));
    
    usedIndices.add(randomIndex);
    
    const relatedItem = document.createElement('div');
    relatedItem.className = 'related-prompt-item';
    relatedItem.onclick = () => openModal(randomIndex);
    
    const title = document.createElement('div');
    title.className = 'related-prompt-title';
    // Create a short title from the prompt
    const promptWords = promptsData[randomIndex].prompt.split(' ');
    title.textContent = promptWords.slice(0, 3).join(' ') + (promptWords.length > 3 ? '...' : '');
    
    const category = document.createElement('div');
    category.className = 'related-prompt-category';
    // Simple category based on prompt content
    if (promptsData[randomIndex].prompt.toLowerCase().includes('landscape')) {
      category.textContent = 'Paisaje';
    } else if (promptsData[randomIndex].prompt.toLowerCase().includes('portrait')) {
      category.textContent = 'Retrato';
    } else if (promptsData[randomIndex].prompt.toLowerCase().includes('futuristic')) {
      category.textContent = 'Futurista';
    } else {
      category.textContent = 'General';
    }
    
    relatedItem.appendChild(title);
    relatedItem.appendChild(category);
    relatedContainer.appendChild(relatedItem);
  }
}

// Function to generate and update prompt metadata
function updatePromptMetadata(index) {
  const categoryEl = document.getElementById('promptCategory');
  const modelEl = document.getElementById('promptModel');
  
  // Simple category detection based on prompt content
  const prompt = promptsData[index].prompt.toLowerCase();
  let category = 'General';
  let model = 'IA Generativa';
  
  // Detect category
  if (prompt.includes('landscape') || prompt.includes('nature') || prompt.includes('scenery')) {
    category = 'Paisaje';
  } else if (prompt.includes('portrait') || prompt.includes('person') || prompt.includes('character')) {
    category = 'Retrato';
  } else if (prompt.includes('city') || prompt.includes('urban') || prompt.includes('building')) {
    category = 'Urbano';
  } else if (prompt.includes('futuristic') || prompt.includes('sci-fi') || prompt.includes('space')) {
    category = 'Futurista';
  } else if (prompt.includes('fantasy') || prompt.includes('magical') || prompt.includes('dragon')) {
    category = 'Fantasía';
  }
  
  // Detect model
  if (prompt.includes('--v') || prompt.includes('--ar')) {
    model = 'Midjourney';
  } else if (prompt.includes('dalle') || prompt.includes('dall-e')) {
    model = 'DALL-E';
  } else if (prompt.includes('sd') || prompt.includes('stable diffusion')) {
    model = 'Stable Diffusion';
  }
  
  categoryEl.textContent = category;
  modelEl.textContent = model;
}

// Function to set up social media sharing buttons
function setupSharingButtons(index, promptTitle) {
  const shareTwitter = document.getElementById('shareTwitter');
  const shareFacebook = document.getElementById('shareFacebook');
  const sharePinterest = document.getElementById('sharePinterest');
  
  const currentUrl = window.location.href;
  const shareText = `Check out this amazing AI prompt: "${promptTitle}..." from Prompts AI`;
  
  // Set up Twitter sharing
  shareTwitter.onclick = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
    window.open(twitterUrl, '_blank');
  };
  
  // Set up Facebook sharing
  shareFacebook.onclick = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    window.open(facebookUrl, '_blank');
  };
  
  // Set up Pinterest sharing
  sharePinterest.onclick = () => {
    // Get the image URL for sharing
    const imageUrl = document.getElementById('modalImage').src;
    const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(currentUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(shareText)}`;
    window.open(pinterestUrl, '_blank');
  };
}

// Enhanced image loading with event handling
function enhancedImageLoading(img) {
  img.onload = () => {
    img.classList.add('loaded');
    positionItem(img.parentElement, img);
  };
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Asegurarse que el layout masonry se inicialice correctamente
  console.log("DOM cargado, inicializando masonry");
  initializeColumns();
  
  // Cargar prompts desde la API
  loadPromptsFromAPI();
  
  // Forzar recálculo del layout después de que todas las imágenes se carguen
  setTimeout(() => {
    console.log("Forzando recálculo del layout después de 1 segundo");
    recalculateLayout();
  }, 1000);

  // Cerrar modal
  document.getElementById("closeModal").onclick = closeModal
  document.getElementById("modal").onclick = (e) => {
    if (e.target.id === "modal") {
      closeModal()
    }
  }

  // Copiar prompt
  document.getElementById("copyBtn").onclick = copyPrompt

  // Cerrar modal con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal()
    }
  })

  // Recalcular layout cuando cambie el tamaño de ventana
  let resizeTimeout
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      recalculateLayout()
    }, 250)
  })

  // Funcionalidad de búsqueda
  const searchInput = document.querySelector(".search-input")
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase()
    const galleryItems = document.querySelectorAll(".gallery-item")

    galleryItems.forEach((item, index) => {
      const prompt = promptsData[index].prompt.toLowerCase()
      if (prompt.includes(searchTerm)) {
        item.style.display = "block"
      } else {
        item.style.display = "none"
      }
    })

    // Recalcular layout después de filtrar
    setTimeout(() => {
      recalculateLayout()
    }, 100)
  })
})

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Load prompts from API
  loadPromptsFromAPI();
  
  // Set up event listeners
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("copyBtn").addEventListener("click", copyPrompt);
  
  // Set up search functionality
  const searchInput = document.getElementById("prompt-search");
  if (searchInput) {
    searchInput.addEventListener("input", function() {
      filterPrompts(this.value);
    });
  }
  
  // Handle modal click to close
  window.addEventListener("click", function(event) {
    const modal = document.getElementById("modal");
    if (event.target === modal) {
      closeModal();
    }
  });
  
  // Handle resize events for masonry layout
  window.addEventListener("resize", debounce(function() {
    if (promptsData.length > 0) {
      createGalleryItems();
    }
  }, 250));
});

// Debounce function to limit resize recalculations
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Filter prompts based on search input
function filterPrompts(searchTerm) {
  if (!searchTerm || searchTerm.trim() === "") {
    createGalleryItems(); // Reset to show all items
    return;
  }
  
  searchTerm = searchTerm.toLowerCase();
  
  const filteredData = promptsData.filter(item => 
    item.prompt.toLowerCase().includes(searchTerm)
  );
  
  const gallery = document.getElementById("gallery");
  
  if (filteredData.length === 0) {
    gallery.innerHTML = `
      <div class="no-results">
        <p>No se encontraron prompts con el término "${searchTerm}".</p>
        <p>Intenta con otra palabra clave.</p>
      </div>
    `;
    return;
  }
  
  // Store original data and replace with filtered data
  const originalData = promptsData;
  promptsData = filteredData;
  
  // Create gallery with filtered data
  createGalleryItems();
  
  // Restore original data
  promptsData = originalData;
}

// Call initial load if not using DOMContentLoaded
if (document.readyState === "complete" || document.readyState === "interactive") {
  loadPromptsFromAPI();
}
