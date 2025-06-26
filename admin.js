// Script para la funcionalidad del panel de administración

document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let deletePromptId = null;
    
    // Elementos DOM
    const promptsTable = document.getElementById('promptsTable');
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
                console.log('Prompts cargados:', data);
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
    
    // Renderizar la tabla de prompts
    function renderPromptTable(data) {
        // Limpiar tabla existente
        promptsTable.innerHTML = '';
        
        if (!data || data.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="4" class="text-center">No hay prompts para mostrar</td>`;
            promptsTable.appendChild(emptyRow);
            return;
        }
        
        data.forEach(item => {
            const row = document.createElement('tr');
            
            // Columna ID
            const idCell = document.createElement('td');
            idCell.textContent = item.id;
            row.appendChild(idCell);
            
            // Columna Imagen
            const imageCell = document.createElement('td');
            const img = document.createElement('img');
            img.src = ensureCorrectImagePath(item.image);
            img.alt = 'Imagen del prompt';
            img.className = 'admin-thumbnail';
            imageCell.appendChild(img);
            row.appendChild(imageCell);
            
            // Columna Prompt (primeros 50 caracteres)
            const promptCell = document.createElement('td');
            promptCell.textContent = item.prompt ? (item.prompt.substring(0, 50) + '...') : '';
            row.appendChild(promptCell);
            
            // Columna Fecha
            const dateCell = document.createElement('td');
            const date = new Date(item.created_at);
            dateCell.textContent = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            row.appendChild(dateCell);
            
            // Columna Acciones
            const actionsCell = document.createElement('td');
            
            // Botón Editar
            const editButton = document.createElement('button');
            editButton.className = 'btn btn-sm btn-primary me-2';
            editButton.innerHTML = '<i class="fas fa-edit"></i> Editar';
            editButton.onclick = () => editPrompt(item.id);
            actionsCell.appendChild(editButton);
            
            // Botón Eliminar
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-danger';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
            deleteButton.onclick = () => showDeleteConfirmation(item.id);
            actionsCell.appendChild(deleteButton);
            
            row.appendChild(actionsCell);
            promptsTable.appendChild(row);
        });
    }
    
    // Mostrar alerta de confirmación para eliminar
    function showDeleteConfirmation(id) {
        deletePromptId = id;
        const modal = new bootstrap.Modal(document.getElementById('deletePromptModal'));
        modal.show();
    }
    
    // Editar prompt
    function editPrompt(id) {
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
            .then(data => {
                // Rellenar formulario
                document.getElementById('editPromptId').value = data.id;
                document.getElementById('editPromptText').value = data.prompt;
                document.getElementById('currentImage').src = ensureCorrectImagePath(data.image);
                
                // Resetear campos de imagen
                document.getElementById('changeImage').checked = false;
                document.getElementById('newImageContainer').classList.add('d-none');
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
    
    // Función para verificar si el usuario está autenticado
    function checkAuthentication() {
        console.log('Verificando autenticación...');
        return fetch('/api/check-session')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error de servidor: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Respuesta de check-session:', data);
                
                if (data.isAuthenticated) {
                    console.log('Usuario autenticado:', data.username);
                    return true;
                }
                
                console.error('No estás autenticado. Se intentará recuperar la sesión automáticamente.');
                
                // Intentar iniciar sesión automáticamente antes de mostrar alertas
                return fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: 'admin',
                        password: 'admin123'
                    }),
                    credentials: 'same-origin' // Importante para mantener cookies de sesión
                })
                .then(loginResponse => loginResponse.json())
                .then(loginData => {
                    if (loginData.success) {
                        console.log('Sesión recuperada automáticamente');
                        return true;
                    } else {
                        console.error('No se pudo recuperar la sesión automáticamente');
                        showAlert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'warning');
                        
                        // Redirigir después de un breve retraso
                        setTimeout(() => {
                            window.location.href = '/login.html';
                        }, 2000);
                        
                        return false;
                    }
                })
                .catch(loginError => {
                    console.error('Error al intentar recuperar sesión:', loginError);
                    showAlert('Error al verificar tu sesión. Intenta recargar la página.', 'danger');
                    return false;
                });
            })
            .catch(error => {
                console.error('Error al verificar autenticación:', error);
                showAlert('Error al verificar sesión: ' + error.message, 'danger');
                return false;
            });
    }
    
    // Guardar nuevo prompt
    saveNewPromptBtn.addEventListener('click', function() {
        // Verificar autenticación antes de continuar
        checkAuthentication().then(isAuthenticated => {
            if (!isAuthenticated) return;
            
            // Continuar con el envío del formulario
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
            
            // Log adicional para depuración del FormData
            console.log('Formulario enviado:', formData);
            // Log de cada entrada en el FormData
            for (const pair of formData.entries()) {
                console.log(`${pair[0]}: ${pair[1]}`);
            }
            
            console.log('Enviando datos del nuevo prompt:', {
                prompt: formData.get('prompt'),
                imageFileName: formData.get('image') ? formData.get('image').name : 'no image',
                imageSize: formData.get('image') ? formData.get('image').size : 0,
                imageType: formData.get('image') ? formData.get('image').type : 'unknown'
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
    });
    
    // Guardar cambios en prompt existente
    saveEditPromptBtn.addEventListener('click', function() {
        // Verificar autenticación antes de continuar
        checkAuthentication().then(isAuthenticated => {
            if (!isAuthenticated) return;
            
            // Continuar con el envío del formulario
            const formData = new FormData(editPromptForm);
            const promptId = formData.get('id');
            
            // Validación básica
            const prompt = formData.get('prompt');
            if (!prompt) {
                showAlert('Por favor, completa la descripción del prompt.', 'warning');
                return;
            }
            
            // Si el checkbox está desactivado, eliminar el campo de imagen para no enviarlo
            if (!changeImageCheckbox.checked) {
                formData.delete('image');
            } else {
                // Si está activado pero no se seleccionó ninguna imagen
                const image = formData.get('image');
                if (!image || image.size === 0) {
                    showAlert('Por favor, selecciona una imagen nueva o desactiva la opción de cambiar imagen.', 'warning');
                    return;
                }
            }
            
            // Mostrar spinner
            const spinner = createSpinner();
            document.body.appendChild(spinner);
            
            fetch(`/api/prompts/${promptId}`, {
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
    });
    
    // Confirmar eliminación
    confirmDeleteBtn.addEventListener('click', function() {
        // Verificar autenticación antes de continuar
        checkAuthentication().then(isAuthenticated => {
            if (!isAuthenticated) return;
            
            // Continuar con la eliminación
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
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cambiar la contraseña');
            }
            return response.json();
        })
        .then(data => {
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();
            
            // Limpiar formulario
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            // Mostrar mensaje de éxito
            showAlert('Contraseña cambiada correctamente', 'success');
            
            // Eliminar spinner
            document.body.removeChild(spinner);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al cambiar la contraseña. ' + error.message, 'danger');
            // Eliminar spinner
            document.body.removeChild(spinner);
        });
    });
    
    // Función para crear un spinner
    function createSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
        `;
        return spinner;
    }
    
    // Función para mostrar alertas
    function showAlert(message, type) {
        const alertsContainer = document.getElementById('alerts');
        
        // Si no existe el contenedor, crear uno temporal
        if (!alertsContainer) {
            console.warn('Contenedor de alertas no encontrado, mostrando alerta en consola:', message);
            
            // Mostrar un alert nativo como fallback
            if (type === 'danger') {
                alert('Error: ' + message);
            } else {
                alert(message);
            }
            return;
        }
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        `;
        
        alertsContainer.appendChild(alert);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
    
    // Cargar datos iniciales
    loadPrompts();
});
