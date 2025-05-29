document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const speechBtnTask = document.getElementById('speechBtn'); // El botón de mic en tareas.html
    const taskList = document.getElementById('taskList');
    const noTasksMsg = document.getElementById('no-items-msg'); // Actualizado el ID en HTML

    if (!taskInput) { // Si no estamos en la página de tareas, no hacer nada.
        return;
    }

    // --- Configuración del Reconocimiento de Voz para TAREAS ---
    if (window.recognition && speechBtnTask) {
        speechBtnTask.onclick = () => {
            try {
                window.recognition.start();
            } catch (e) { console.warn("Error al iniciar reconocimiento (puede ser por inicio rápido):", e.message); }
        };

        window.recognition.onstart = () => {
            speechBtnTask.textContent = '🎙️...';
            speechBtnTask.classList.add('listening');
            speechBtnTask.disabled = true;
        };

        window.recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            taskInput.value = speechResult;
        };
        
        window.recognition.onend = () => { // Se llama después de onresult o onerror
            speechBtnTask.textContent = '🎤';
            speechBtnTask.classList.remove('listening');
            speechBtnTask.disabled = false;
        };

        window.recognition.onerror = (event) => {
            console.error('Error en el reconocimiento de voz (Tareas): ' + event.error);
            // Manejo de errores específico si es necesario
            // (ya hay un manejo genérico en script.js, pero puedes añadir más aquí)
        };
    } else if (speechBtnTask) {
        speechBtnTask.style.display = 'none'; // Ocultar si no hay soporte global
    }


    // --- Funcionalidad de Tareas (Añadir, Marcar, Eliminar) ---
    async function addTask() {
        const description = taskInput.value.trim();
        if (!description) {
            alert("Por favor, escribe o dicta una tarea.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('description', description);

            const response = await fetch('/tareas/add', { // URL actualizada
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.status === 'success' && result.task) {
                appendTaskToDOM(result.task);
                taskInput.value = '';
                if (noTasksMsg) noTasksMsg.style.display = 'none';
            } else {
                alert('Error al añadir tarea: ' + (result.message || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error en fetch add_task:', error);
            alert('Error de conexión al añadir tarea.');
        }
    }
    
    function appendTaskToDOM(task) {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item', 'item-card'); // Clases actualizadas
        if (task.is_done) {
            taskItem.classList.add('done');
        }
        taskItem.dataset.id = task.id;

        taskItem.innerHTML = `
            <span class="task-description item-description">${window.escapeHTML(task.description)}</span>
            <div class="task-actions item-actions">
                <button class="speak-item icon-button" title="Escuchar tarea">🔊</button>
                <button class="toggle-done-btn icon-button" title="Marcar como hecha/pendiente">
                    ${task.is_done ? '🔄' : '✔️'}
                </button>
                <button class="delete-item-btn icon-button" title="Eliminar tarea">🗑️</button>
            </div>
        `;
        // Insertar al principio de la lista de tareas
        if (taskList.firstChild && taskList.firstChild.id === 'no-items-msg') {
            taskList.insertBefore(taskItem, taskList.firstChild.nextSibling); // Insertar después del mensaje si existe
        } else if (taskList.firstChild) {
             taskList.insertBefore(taskItem, taskList.firstChild);
        }
        else {
            taskList.appendChild(taskItem);
        }
        
        if(noTasksMsg && taskList.querySelectorAll('.task-item').length > 0) {
            noTasksMsg.style.display = 'none';
        }
    }

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    taskList.addEventListener('click', async (event) => {
        const target = event.target;
        const taskItem = target.closest('.task-item');
        if (!taskItem) return;

        const taskId = taskItem.dataset.id;

        if (target.classList.contains('speak-item')) {
            const textToSpeak = taskItem.querySelector('.task-description').textContent;
            window.speakText(textToSpeak); // Usar la función global
        } else if (target.classList.contains('toggle-done-btn')) {
            try {
                const response = await fetch(`/tareas/toggle/${taskId}`, { method: 'POST' }); // URL actualizada
                const result = await response.json();
                if (result.status === 'success') {
                    taskItem.classList.toggle('done', result.new_status === 1);
                    target.textContent = result.new_status === 1 ? '🔄' : '✔️';
                } else {
                    alert('Error al actualizar tarea.');
                }
            } catch (error) {
                console.error('Error en fetch toggle_task:', error);
                alert('Error de conexión al actualizar tarea.');
            }
        } else if (target.classList.contains('delete-item-btn')) {
            if (confirm('¿Seguro que quieres borrar esta tarea?')) {
                try {
                    const response = await fetch(`/tareas/delete/${taskId}`, { method: 'POST' }); // URL actualizada
                    const result = await response.json();
                    if (result.status === 'success') {
                        taskItem.remove();
                        if(taskList.querySelectorAll('.task-item').length === 0){
                            if(noTasksMsg) noTasksMsg.style.display = 'block';
                        }
                    } else {
                        alert('Error al borrar tarea: ' + (result.message || 'Error desconocido'));
                    }
                } catch (error) {
                    console.error('Error en fetch delete_task:', error);
                    alert('Error de conexión al borrar tarea.');
                }
            }
        }
    });

    // Ocultar mensaje "No hay tareas" si ya hay tareas al cargar la página
    if (noTasksMsg && taskList.querySelectorAll('.task-item').length > 0) {
        noTasksMsg.style.display = 'none';
    }
});