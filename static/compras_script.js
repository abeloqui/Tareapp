document.addEventListener('DOMContentLoaded', () => {
    const addGastoForm = document.getElementById('addGastoForm');
    const gastoDescriptionInput = document.getElementById('gastoDescription');
    const speechBtnGasto = document.getElementById('speechBtnGasto');
    const gastoList = document.getElementById('gastoList'); // El div que contiene la lista de gastos
    const noGastosMsg = gastoList.querySelector('#no-items-msg'); // El <p> dentro de gastoList

    if (!addGastoForm) { // Si no estamos en la página de compras, no hacer nada
        return;
    }
    
    // --- Configuración del Reconocimiento de Voz para GASTOS ---
    if (window.recognition && speechBtnGasto) {
        speechBtnGasto.onclick = () => {
            try {
                window.recognition.start();
            } catch (e) { console.warn("Error al iniciar reconocimiento (puede ser por inicio rápido):", e.message); }
        };

        window.recognition.onstart = () => {
            speechBtnGasto.textContent = '🎙️...';
            speechBtnGasto.classList.add('listening');
            speechBtnGasto.disabled = true;
        };

        window.recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            gastoDescriptionInput.value = speechResult;
        };
        
        window.recognition.onend = () => {
            speechBtnGasto.textContent = '🎤';
            speechBtnGasto.classList.remove('listening');
            speechBtnGasto.disabled = false;
        };
        
        window.recognition.onerror = (event) => {
            console.error('Error en el reconocimiento de voz (Compras): ' + event.error);
        };
    } else if (speechBtnGasto) {
        speechBtnGasto.style.display = 'none';
    }

    // --- Funcionalidad de Gastos ---
    addGastoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addGastoForm);
        
        // Validar descripción localmente también
        const description = formData.get('description').trim();
        if (!description) {
            alert("La descripción del gasto es obligatoria.");
            gastoDescriptionInput.focus();
            return;
        }

        try {
            // const response = await fetch("{{ url_for('add_gasto_route') }}", { // Esto no funciona en JS puro
            const response = await fetch(GASTOS_ADD_URL, { // Usar la variable global definida en el HTML
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.status === 'success' && result.gasto) {
                appendGastoToDOM(result.gasto);
                addGastoForm.reset(); // Limpiar formulario
                // Establecer la fecha de nuevo al día actual después de resetear
                document.getElementById('gastoDate').valueAsDate = new Date();
                if (noGastosMsg) noGastosMsg.style.display = 'none';
            } else {
                alert('Error al añadir gasto: ' + (result.message || 'Error desconocido.'));
            }
        } catch (error) {
            console.error('Error en fetch add_gasto:', error);
            alert('Error de conexión al añadir gasto.');
        }
    });

    function appendGastoToDOM(gasto) {
        const gastoItem = document.createElement('div');
        gastoItem.classList.add('gasto-item', 'item-card');
        gastoItem.dataset.id = gasto.id;

        let amountHTML = '';
        if (gasto.amount !== null && gasto.amount !== undefined) {
            amountHTML = `<span class="gasto-amount">Monto: ${parseFloat(gasto.amount).toFixed(2)} €/$</span>`;
        }
        let categoryHTML = '';
        if (gasto.category) {
            categoryHTML = `<span class="gasto-category">Categoría: ${window.escapeHTML(gasto.category)}</span>`;
        }

        // Formatear fecha (YYYY-MM-DD a DD/MM/YYYY)
        let formattedDate = 'N/A';
        if (gasto.date_created) {
            try {
                const [year, month, day] = gasto.date_created.split('-');
                formattedDate = `${day}/${month}/${year}`;
            } catch(e) { console.error("Error formateando fecha del gasto", e); }
        }


        gastoItem.innerHTML = `
            <div class="item-info">
                <strong class="item-description">${window.escapeHTML(gasto.description)}</strong>
                ${amountHTML}
                ${categoryHTML}
                <span class="gasto-date">Fecha: ${formattedDate}</span>
            </div>
            <div class="item-actions">
                <button class="speak-item icon-button" title="Escuchar gasto">🔊</button>
                <button class="delete-item-btn icon-button" title="Eliminar gasto">🗑️</button>
            </div>
        `;
        
        // Insertar el nuevo gasto al principio de la lista, después del título "Historial de Gastos" si existe
        const h2Historial = gastoList.querySelector('h2');
        if (h2Historial) {
            h2Historial.insertAdjacentElement('afterend', gastoItem);
        } else {
            gastoList.prepend(gastoItem);
        }


        if(noGastosMsg && gastoList.querySelectorAll('.gasto-item').length > 0) {
            noGastosMsg.style.display = 'none';
        }
    }

    gastoList.addEventListener('click', async (event) => {
        const target = event.target;
        const gastoItem = target.closest('.gasto-item');
        if (!gastoItem) return;

        const gastoId = gastoItem.dataset.id;

        if (target.classList.contains('speak-item')) {
            let textToSpeak = gastoItem.querySelector('.item-description').textContent;
            const amountEl = gastoItem.querySelector('.gasto-amount');
            const categoryEl = gastoItem.querySelector('.gasto-category');
            if(amountEl) textToSpeak += ". " + amountEl.textContent;
            if(categoryEl) textToSpeak += ". " + categoryEl.textContent;
            window.speakText(textToSpeak);
        } else if (target.classList.contains('delete-item-btn')) {
            if (confirm('¿Seguro que quieres borrar este gasto?')) {
                try {
                    // const response = await fetch(`/compras/delete/${gastoId}`, { method: 'POST' });
                    const response = await fetch(`${GASTOS_DELETE_URL_BASE}${gastoId}`, { method: 'POST' });
                    const result = await response.json();
                    if (result.status === 'success') {
                        gastoItem.remove();
                        if(gastoList.querySelectorAll('.gasto-item').length === 0){
                            if(noGastosMsg) noGastosMsg.style.display = 'block';
                        }
                    } else {
                        alert('Error al borrar gasto: ' + (result.message || 'Error desconocido'));
                    }
                } catch (error) {
                    console.error('Error en fetch delete_gasto:', error);
                    alert('Error de conexión al borrar gasto.');
                }
            }
        }
    });
    
    // Ocultar mensaje "No hay gastos" si ya hay gastos al cargar la página
    if (noGastosMsg && gastoList.querySelectorAll('.gasto-item').length > 0) {
        noGastosMsg.style.display = 'none';
    }

    // Poner la fecha de hoy por defecto en el input de fecha de compras
    const gastoDateInput = document.getElementById('gastoDate');
    if (gastoDateInput && !gastoDateInput.value) { // Si no tiene valor (por si el backend no lo puso)
        gastoDateInput.valueAsDate = new Date();
    }
});