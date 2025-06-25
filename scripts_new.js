// Array para almacenar los datos de los prompts cargados desde la API
let promptsData = [];

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
      console.log(`Recibidos ${data.length} prompts desde la API`);
      
      // Verificar los datos recibidos
      if (data.length > 0) {
        console.log('Ejemplo de primer prompt:', JSON.stringify(data[0]));
      }
      
      promptsData = data;
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
          <button onclick="forceReload()">Reintentar</button>
        </div>
      `;
    });
}

// Función para forzar una recarga completa
function forceReload() {
  console.log('Forzando recarga...');
  window.location.reload(true);
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

// Función para crear elementos de la galería
function createGalleryItems() {
  const gallery = document.getElementById("gallery")
  
  // Limpiar galería existente
  gallery.innerHTML = '';

  promptsData.forEach((item, index) => {
    const galleryItem = document.createElement("div")
    galleryItem.className = "gallery-item"
    galleryItem.onclick = () => openModal(index)

    const img = document.createElement("img")
    // Asegurar que la ruta de la imagen sea correcta
    img.src = ensureCorrectImagePath(item.image)
    img.alt = item.prompt ? `${item.prompt.substring(0, 30)}...` : `Prompt ${index + 1}`
    img.loading = "lazy"

    // Cuando la imagen carga, posicionarla en el masonry
    img.onload = () => {
      positionItem(galleryItem, img)
    }
    
    // Manejar errores de carga de imagen
    img.onerror = () => {
      console.error(`Error al cargar imagen: ${img.src}`)
      img.src = '/images/placeholder.jpg'
      positionItem(galleryItem, img)
    }

    galleryItem.appendChild(img)
    gallery.appendChild(galleryItem)
  })
}

// Función para asegurar que la ruta de la imagen sea correcta
function ensureCorrectImagePath(imagePath) {
  // Si no hay ruta de imagen o está vacía, usar placeholder
  if (!imagePath || imagePath.trim() === '') {
    console.log("No hay ruta de imagen, usando placeholder")
    return '/images/placeholder.jpg'
  }
  
  let processedPath = imagePath
  console.log(`Procesando ruta de imagen: "${processedPath}"`)
  
  // Si ya tiene la ruta completa con http, devolverla
  if (processedPath.startsWith('http')) {
    console.log(`Ruta externa (http): ${processedPath}`)
    return processedPath
  }
  
  // Si ya viene con la ruta correcta desde el servidor (/images/...), usarla directamente
  if (processedPath.startsWith('/images/')) {
    console.log(`Ruta correcta del servidor: ${processedPath}`)
    return processedPath
  }
  
  // Si ya tiene 'images/' al inicio (sin barra), agregarle la barra
  if (processedPath.startsWith('images/')) {
    const finalPath = `/${processedPath}`
    console.log(`Agregando barra inicial: ${finalPath}`)
    return finalPath
  }
  
  // Para cualquier otro caso, añadir el prefijo '/images/'
  const finalPath = `/images/${processedPath}`
  console.log(`Ruta final normalizada: ${finalPath}`)
  return finalPath
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
  initializeColumns()
  const items = document.querySelectorAll(".gallery-item")

  items.forEach((item, index) => {
    const img = item.querySelector("img")
    if (img.complete) {
      positionItem(item, img)
    }
  })
}

// Función para abrir el modal
function openModal(index) {
  const modal = document.getElementById("modal")
  const modalImage = document.getElementById("modalImage")
  const promptText = document.getElementById("promptText")
  const promptTitle = document.getElementById("promptTitle")
  const promptCategory = document.getElementById("promptCategory")

  // Usar la función para normalizar la ruta de la imagen
  modalImage.src = ensureCorrectImagePath(promptsData[index].image)
  promptText.textContent = promptsData[index].prompt

  // Añadir título descriptivo basado en el contenido del prompt
  const shortPrompt = promptsData[index].prompt.substring(0, 40)
  promptTitle.textContent = `✨ ${shortPrompt}...`
  
  // Mostrar categoría si existe
  if (promptsData[index].categories && promptsData[index].categories.length > 0) {
    promptCategory.textContent = promptsData[index].categories[0]
    promptCategory.style.display = 'inline-block'
  } else {
    promptCategory.textContent = 'General'
    promptCategory.style.display = 'inline-block'
  }

  modal.style.display = "block"
  document.body.style.overflow = "hidden"
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
  navigator.clipboard
    .writeText(promptText)
    .then(() => {
      const copyBtn = document.getElementById("copyBtn")
      const originalText = copyBtn.innerHTML

      copyBtn.innerHTML = "✅ ¡Copiado!"
      copyBtn.classList.add("copied")

      setTimeout(() => {
        copyBtn.innerHTML = originalText
        copyBtn.classList.remove("copied")
      }, 2500)
    })
    .catch((err) => {
      console.error("Error al copiar: ", err)
      const copyBtn = document.getElementById("copyBtn")
      copyBtn.innerHTML = "❌ Error al copiar"
      setTimeout(() => {
        copyBtn.innerHTML = "📋 Copiar Prompt"
      }, 2000)
    })
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeColumns()
  
  // Cargar prompts desde la API
  loadPromptsFromAPI();

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
