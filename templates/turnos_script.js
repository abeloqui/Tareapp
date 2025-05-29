document.addEventListener('DOMContentLoaded', () => {
    const addTurnoForm = document.getElementById('addTurnoForm');
    const proximosTurnosList = document.querySelector('.proximos-turnos');

    // Inputs para dictado
    const turnoDescriptionInput = document.getElementById('turnoDescription');
    const speechBtnTurnoDesc = document.getElementById('speechBtnTurnoDesc');
    const turnoAddressInput = document.getElementById('turnoAddress');
    const speechBtnTurnoAddr = document.getElementById('speechBtnTurnoAddr');
    const turnoNotesInput = document.getElementById('turnoNotes');
    const speechBtnTurnoNotes = document.getElementById('speechBtnTurnoNotes');


    if (!proximosTurnosList && !addTurnoForm) { // Si no estamos en la página de turnos
        return;
    }

    // --- Configuración del Reconocimiento de Voz ---
    function setupSpeechRecognition(inputElement, buttonElement) {
        if (window.recognition && buttonElement && inputElement) {
            buttonElement.onclick = () => {
                try { window.recognition.start(); } catch (e) { console.warn("Error al iniciar reconocimiento (Turnos):", e.message); }
            };
            // Estos manejadores se sobreescribirán por cada botón, el último ganará.
            // Necesitamos una instancia de recognition por input o manejar el target.
            // Por simplicidad, por ahora, el último botón de mic pulsado será el que actualice su input.
            // Una mejor solución sería crear instancias separadas o pasar el target.

            // Mejor: un solo manejador de evento que determine qué input rellenar
            let currentSpeechInput = null;

            [speechBtnTurnoDesc, speechBtnTurnoAddr, speechBtnTurnoNotes].forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', function() {
                        if (this === speechBtnTurnoDesc) currentSpeechInput = turnoDescriptionInput;
                        else if (this === speechBtnTurnoAddr) currentSpeechInput = turnoAddressInput;
                        else if (this === speechBtnTurnoNotes) currentSpeechInput = turnoNotesInput;
                        
                        if (window.recognition && currentSpeechInput) {
                             try { window.recognition.start(); } catch (e) { console.warn("Error al iniciar reconocimiento (Turnos):", e.message); }
                        }
                    });
                }
            });
            
            if(window.recognition){
                window.recognition.onstart = () => {
                    // Podríamos cambiar el estilo del botón activo
                    document.querySelectorAll('.speech-button').forEach(b => {
                        if ((b === speechBtnTurnoDesc && currentSpeechInput === turnoDescriptionInput) ||
                            (b === speechBtnTurnoAddr && currentSpeechInput === turnoAddressInput) ||
                            (b === speechBtnTurnoNotes && currentSpeechInput === turnoNotesInput)) {
                            b.textContent = '🎙️...';
                            b.classList.add('listening');
                            b.disabled = true;
                        }
                    });
                };
                window.recognition.onresult = (event) => {
                    if (currentSpeechInput) {
                        currentSpeechInput.value = event.results[0][0].transcript;
                    }
                };
                window.recognition.onend = () => {
                     document.querySelectorAll('.speech-button').forEach(b => {
                        b.textContent = '🎤';
                        b.classList.remove('listening');
                        b.disabled = false;
                    });
                    currentSpeechInput = null; // Resetear
                };
                window.recognition.onerror = (event) => {
                    console.error('Error reconocimiento (Turnos): ' + event.error);
                     document.querySelectorAll('.speech-button').forEach(b => {
                        b.textContent = '🎤';
                        b.classList.remove('listening');
                        b.disabled = false;
                    });
                };
            }

        } else if (buttonElement) {
            buttonElement.style.display = 'none';
        }
    }

    setupSpeechRecognition(turnoDescriptionInput, speechBtnTurnoDesc);
    setupSpeechRecognition(turnoAddressInput, speechBtnTurnoAddr);
    setupSpeechRecognition(turnoNotesInput, speechBtnTurnoNotes);


    // --- Lógica para Marcar Estado del Turno ---
    if (proximosTurnosList) {
        proximosTurnosList.addEventListener('click', async (event) => {
            const target = event.target;
            const turnoItem = target.closest('.turno-item');
            if (!turnoItem) return;

            const turnoId = turnoItem.dataset.id;

            if (target.classList.contains('speak-item')) {
                const desc = turnoItem.querySelector('.turno-description').textContent.trim();
                const dateTime = turnoItem.querySelector('.turno-date-time').textContent.replace(/\s+/g, ' ').trim();
                let textToSpeak = `${desc}. ${dateTime}.`;
                const address = turnoItem.querySelector('.turno-address');
                if (address) textToSpeak += ` ${address.textContent.trim()}.`;
                const notes = turnoItem.querySelector('.turno-notes');
                if (notes) textToSpeak += ` ${notes.textContent.trim()}.`;
                window.speakText(textToSpeak);

            } else if (target.classList.contains('mark-status-btn')) {
                const newStatus = target.dataset.newStatus;
                if (!newStatus) return;

                if (confirm(`¿Seguro que quieres marcar este turno como "${newStatus}"?`)) {
                    try {
                        const formData = new FormData();
                        formData.append('status', newStatus);

                        const response = await fetch(`${TURNOS_UPDATE_STATUS_URL_BASE}${turnoId}`, {
                            method: 'POST',
                            body: formData
                        });
                        const result = await response.json();

                        if (result.status === 'success') {
                            // Actualizar visualmente el item (ej. quitarlo de la lista de próximos o cambiar estilo)
                            // Para una UX simple, podemos simplemente recargar la página o quitar el elemento.
                            // alert(result.message); // O un feedback más sutil
                            turnoItem.remove(); // Quita el turno de la lista de "próximos"
                                                // Idealmente, se movería a una lista de "historial".
                            // window.location.reload(); // Más simple, pero menos elegante
                        } else {
                            alert('Error al actualizar estado: ' + (result.message || 'Error desconocido'));
                        }
                    } catch (error) {
                        console.error('Error en fetch update_turno_status:', error);
                        alert('Error de conexión al actualizar estado del turno.');
                    }
                }
            }
            // Implementar delete-turno-btn de manera similar si lo añades
        });
    }

    // addTurnoForm ya envía de forma tradicional, si quieres AJAX, hay que prevenir default y usar fetch.
    // Por ahora, el envío tradicional con redirect desde Flask está bien.
});