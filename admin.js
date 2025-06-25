// Script para la funcionalidad del panel de administración

document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let deletePromptId = null;
    
    // Elementos DOM
    const promptsTable = document.getElementById('pr        })
        .catch(error => {
            console.error('Error:', error);
            showAlert(`Error al guardar el prompt: ${error.message}. Revise la consola para más detalles.`, 'danger');
            // Eliminar spinner
            document.body.removeChild(spinner);
        });ble');
    const addPromptForm = document.getElementById('addPromptForm');
    const editPromptForm = document.getElementById('editPromptForm');
    const saveNewPromptBtn = document.getElementById('saveNewPrompt');
    const saveEditPromptBtn = document.getElementById('saveEditPrompt');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const changeImageCheckbox = document.getElementById('changeImage');
    const newImageContainer = document.getElementById('newImageContainer');
    
    // Previsualización de imagen al agregar
    document.getElementById('addPromptImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imagePreview = document.getElementById('imagePreview');
                imagePreview.querySelector('img').src = e.target.result;
                imagePreview.classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Previsualización de imagen al editar
    document.getElementById('editPromptImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imagePreview = document.getElementById('editImagePreview');
                imagePreview.querySelector('img').src = e.target.result;
                imagePreview.classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Mostrar/ocultar campo de nueva imagen en edición
    changeImageCheckbox.addEventListener('change', function() {
        if (this.checked) {
            newImageContainer.classList.remove('d-none');
        } else {
            newImageContainer.classList.add('d-none');
            document.getElementById('editPromptImage').value = '';
            document.getElementById('editImagePreview').classList.add('d-none');
        }
    });
    
    // Cargar todos los prompts
    function loadPrompts() {
        // Mostrar spinner de carga
        const spinner = createSpinner();
        document.body.appendChild(spinner);
        
        fetch('/api/prompts')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al cargar los prompts');
                }
                return response.json();
            })
            .then(data => {
                renderPromptTable(data);
                // Eliminar spinner
                document.body.removeChild(spinner);
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Error al cargar los datos. ' + error.message, 'danger');
                // Eliminar spinner
                document.body.removeChild(spinner);
            });
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
        
        // Para cualquier otro caso, añadir el prefijo '/images/'
        const finalPath = `/images/${processedPath}`;
        console.log(`Ruta final normalizada: ${finalPath}`);
        return finalPath;
    }
    
    // Renderizar tabla de prompts
    function renderPromptTable(prompts) {
        promptsTable.innerHTML = '';
        
        if (prompts.length === 0) {
            promptsTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No hay prompts disponibles</td>
                </tr>
            `;
            return;
        }
        
        prompts.forEach(prompt => {
            const row = document.createElement('tr');
            
            // Formatear fecha
            const date = new Date(prompt.created_at);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            row.innerHTML = `
                <td>${prompt.id}</td>
                <td><img src="${ensureCorrectImagePath(prompt.image)}" alt="Imagen" class="img-thumbnail"></td>
                <td>
                    <div class="prompt-text" title="${prompt.prompt}">
                        ${prompt.prompt}
                    </div>
                </td>
                <td>${formattedDate}</td>
                <td class="actions-column">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary edit-prompt" data-id="${prompt.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger delete-prompt" data-id="${prompt.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </td>
            `;
            
            promptsTable.appendChild(row);
        });
        
        // Evento para expandir/contraer descripción del prompt
        document.querySelectorAll('.prompt-text').forEach(el => {
            el.addEventListener('click', function() {
                this.classList.toggle('prompt-text-full');
            });
        });
        
        // Agregar eventos a los botones de editar y eliminar
        addButtonEventListeners();
    }
    
    // Agregar eventos a los botones de acción
    function addButtonEventListeners() {
        // Botones de editar
        document.querySelectorAll('.edit-prompt').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                openEditModal(id);
            });
        });
        
        // Botones de eliminar
        document.querySelectorAll('.delete-prompt').forEach(button => {
            button.addEventListener('click', function() {
                deletePromptId = this.getAttribute('data-id');
                const deleteModal = new bootstrap.Modal(document.getElementById('deletePromptModal'));
                deleteModal.show();
            });
        });
    }
    
    // Abrir modal de edición con datos
    function openEditModal(id) {
        // Mostrar spinner
        const spinner = createSpinner();
        document.body.appendChild(spinner);
        
        fetch(`/api/prompts/${id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al cargar los datos del prompt');
                }
                return response.json();
            })
            .then(prompt => {
                document.getElementById('editPromptId').value = prompt.id;
                document.getElementById('editPromptText').value = prompt.prompt;
                document.getElementById('currentImage').src = ensureCorrectImagePath(prompt.image);
                
                // Resetear el checkbox y el contenedor de nueva imagen
                changeImageCheckbox.checked = false;
                newImageContainer.classList.add('d-none');
                document.getElementById('editPromptImage').value = '';
                document.getElementById('editImagePreview').classList.add('d-none');
                
                // Mostrar el modal
                const editModal = new bootstrap.Modal(document.getElementById('editPromptModal'));
                editModal.show();
                
                // Eliminar spinner
                document.body.removeChild(spinner);
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('Error al cargar los datos para editar. ' + error.message, 'danger');
                // Eliminar spinner
                document.body.removeChild(spinner);
            });
    }
    
    // Guardar nuevo prompt
    saveNewPromptBtn.addEventListener('click', function() {
        const formData = new FormData(addPromptForm);
        
        // Validación básica
        const prompt = formData.get('prompt');
        const image = formData.get('image');
        
        if (!prompt || !image || image.size === 0) {
            showAlert('Por favor, completa todos los campos y selecciona una imagen.', 'warning');
            return;
        }
        
        // Mostrar spinner
        const spinner = createSpinner();
        document.body.appendChild(spinner);
        
        console.log('Enviando datos del nuevo prompt:', {
            prompt: formData.get('prompt'),
            imageFileName: formData.get('image').name,
            imageSize: formData.get('image').size,
            imageType: formData.get('image').type
        });
        
        fetch('/api/prompts', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Respuesta recibida:', response.status, response.statusText);
            
            // Primero intentar obtener el texto de la respuesta para depurar
            return response.text().then(text => {
                console.log('Respuesta como texto:', text);
                
                if (!response.ok) {
                    throw new Error(`Error al guardar el prompt: ${response.status} ${response.statusText}`);
                }
                
                // Si llegamos aquí, intentar parsear como JSON
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('Error al parsear JSON:', e);
                    throw new Error(`Error al parsear respuesta: ${e.message}`);
                }
            });
        })
        .then(data => {
            console.log('Datos de respuesta:', data);
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addPromptModal'));
            modal.hide();
            
            // Limpiar formulario
            addPromptForm.reset();
            document.getElementById('imagePreview').classList.add('d-none');
            
            // Mostrar mensaje de éxito
            showAlert('Prompt agregado correctamente', 'success');
            
            // Recargar tabla
            loadPrompts();
            
            // Eliminar spinner
            document.body.removeChild(spinner);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert(`Error al guardar el prompt: ${error.message}. Revise la consola para más detalles.`, 'danger');
            // Eliminar spinner
            document.body.removeChild(spinner);
        });
    });
    
    // Guardar cambios en prompt existente
    saveEditPromptBtn.addEventListener('click', function() {
        const id = document.getElementById('editPromptId').value;
        const formData = new FormData();
        
        // Agregar el prompt
        formData.append('prompt', document.getElementById('editPromptText').value);
        
        // Si se decidió cambiar la imagen, agregarla al FormData
        if (changeImageCheckbox.checked) {
            const imageFile = document.getElementById('editPromptImage').files[0];
            if (imageFile) {
                formData.append('image', imageFile);
            } else {
                showAlert('Por favor, selecciona una imagen nueva.', 'warning');
                return;
            }
        }
        
        // Mostrar spinner
        const spinner = createSpinner();
        document.body.appendChild(spinner);
        
        fetch(`/api/prompts/${id}`, {
            method: 'PUT',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al actualizar el prompt');
            }
            return response.json();
        })
        .then(data => {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editPromptModal'));
            modal.hide();
            
            // Mostrar mensaje de éxito
            showAlert('Prompt actualizado correctamente', 'success');
            
            // Recargar tabla
            loadPrompts();
            
            // Eliminar spinner
            document.body.removeChild(spinner);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al actualizar el prompt. ' + error.message, 'danger');
            // Eliminar spinner
            document.body.removeChild(spinner);
        });
    });
    
    // Confirmar eliminación de prompt
    confirmDeleteBtn.addEventListener('click', function() {
        if (!deletePromptId) return;
        
        // Mostrar spinner
        const spinner = createSpinner();
        document.body.appendChild(spinner);
        
        fetch(`/api/prompts/${deletePromptId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al eliminar el prompt');
            }
            return response.json();
        })
        .then(data => {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deletePromptModal'));
            modal.hide();
            
            // Mostrar mensaje de éxito
            showAlert('Prompt eliminado correctamente', 'success');
            
            // Recargar tabla
            loadPrompts();
            
            // Eliminar spinner
            document.body.removeChild(spinner);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al eliminar el prompt. ' + error.message, 'danger');
            // Eliminar spinner
            document.body.removeChild(spinner);
        });
    });
    
    // Cambiar contraseña
    const saveNewPasswordBtn = document.getElementById('saveNewPassword');
    
    saveNewPasswordBtn.addEventListener('click', function() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validación básica
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert('Por favor, completa todos los campos.', 'warning');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showAlert('Las contraseñas nuevas no coinciden.', 'warning');
            return;
        }
        
        // Mostrar spinner
        const spinner = createSpinner();
        document.body.appendChild(spinner);
        
        fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
        })
        .then(response => response.json())
        .then(data => {
            // Eliminar spinner
            document.body.removeChild(spinner);
            
            if (data.error) {
                showAlert(data.error, 'danger');
                return;
            }
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();
            
            // Limpiar formulario
            document.getElementById('changePasswordForm').reset();
            
            // Mostrar mensaje de éxito
            showAlert('Contraseña actualizada correctamente', 'success');
        })
        .catch(error => {
            // Eliminar spinner
            document.body.removeChild(spinner);
            
            console.error('Error:', error);
            showAlert('Error al cambiar la contraseña. ' + error.message, 'danger');
        });
    });
    
    // Actualizar categorías
    const updateCategoriesBtn = document.getElementById('updateCategoriesBtn');
    if (updateCategoriesBtn) {
        updateCategoriesBtn.addEventListener('click', function() {
            // Mostrar indicador de carga
            updateCategoriesBtn.disabled = true;
            updateCategoriesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            
            // Hacer la solicitud a la API
            fetch('/api/admin/update-categories')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error al actualizar categorías');
                    }
                    return response.json();
                })
                .then(data => {
                    // Mostrar mensaje de éxito
                    showNotification('success', data.message || 'Categorías actualizadas correctamente');
                    // Recargar la tabla para mostrar las nuevas categorías
                    loadPrompts();
                })
                .catch(error => {
                    showNotification('error', error.message);
                })
                .finally(() => {
                    // Restaurar el botón
                    updateCategoriesBtn.disabled = false;
                    updateCategoriesBtn.innerHTML = '<i class="fas fa-tags"></i> Actualizar Categorías';
                });
        });
    }
    
    // Función para mostrar alertas
    function showAlert(message, type = 'info') {
        // Crear contenedor de alertas si no existe
        let alertContainer = document.querySelector('.alert-container');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.className = 'alert-container';
            document.body.appendChild(alertContainer);
        }
        
        // Crear alerta
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show custom-alert`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Agregar alerta al contenedor
        alertContainer.appendChild(alert);
        
        // Eliminar alerta después de 5 segundos
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => {
                alertContainer.removeChild(alert);
            }, 150);
        }, 5000);
    }
    
    // Función para crear spinner de carga
    function createSpinner() {
        const spinnerOverlay = document.createElement('div');
        spinnerOverlay.className = 'spinner-overlay';
        spinnerOverlay.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        `;
        return spinnerOverlay;
    }
    
    // Función para mostrar notificaciones
    function showNotification(type, message) {
        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        const alertIcon = type === 'success' ? 'check-circle' : 'exclamation-triangle';
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.setAttribute('role', 'alert');
        
        alertDiv.innerHTML = `
            <i class="fas fa-${alertIcon} me-2"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 500);
        }, 5000);
    }
    
    // Cargar datos iniciales
    loadPrompts();
});
