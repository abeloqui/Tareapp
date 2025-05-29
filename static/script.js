// Este archivo contendrá funciones MUY generales o inicializaciones.
// La lógica específica de cada módulo irá en su propio archivo JS.

document.addEventListener('DOMContentLoaded', () => {
    console.log("Asistente de Suegra - JS General Cargado");

    // --- Funcionalidad de Habla (Text-to-Speech) GENÉRICA ---
    // Esta función puede ser llamada desde los scripts específicos de cada módulo.
    window.speakText = function(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.pitch = 1;
            utterance.rate = 0.9; // Un poco más lento para mayor claridad
            window.speechSynthesis.cancel(); // Cancela cualquier habla anterior
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("El navegador no soporta la lectura de voz (SpeechSynthesis).");
            // Podrías mostrar un alert aquí si es crítico, pero console.warn es menos intrusivo.
            // alert("Tu navegador no soporta la lectura de voz.");
        }
    };

    // --- Funcionalidad de Reconocimiento de Voz (Speech-to-Text) GENÉRICA ---
    // Similar a speakText, esta es una configuración base.
    // El botón específico y el input target se pasarán o se manejarán en el script del módulo.
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        window.recognition = new SpeechRecognition(); // Hacerlo global para acceso fácil
        window.recognition.lang = 'es-ES';
        window.recognition.interimResults = false;
        window.recognition.maxAlternatives = 1;

        // Los manejadores de eventos (onresult, onerror, etc.) se configurarán
        // en los scripts específicos (tareas_script.js, compras_script.js)
        // porque necesitarán interactuar con elementos de su página.
    } else {
        console.warn("El navegador no soporta el dictado por voz (SpeechRecognition).");
        // Ocultar todos los botones de speech si no hay soporte
        document.querySelectorAll('.speech-button').forEach(btn => btn.style.display = 'none');
    }


    // --- Helper para escapar HTML ---
    window.escapeHTML = function(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

});