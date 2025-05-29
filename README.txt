# Aplicación Asistente Personal para Suegra

Esta es una aplicación web simple creada con Flask (Python) y JavaScript para ayudar a gestionar tareas, con funcionalidades de dictado por voz y lectura de texto.

## Prerrequisitos

*   Python 3.7+
*   pip (gestor de paquetes de Python)
*   Un navegador web moderno (Chrome, Firefox, Edge son recomendados para la Web Speech API)

## Configuración del Entorno

1.  **Clona o descarga y descomprime este proyecto.**
2.  **Navega a la carpeta del proyecto** en tu terminal:
    ```bash
    cd ruta/a/suegra_app
    ```
3.  **(Recomendado) Crea y activa un entorno virtual:**
    *   En macOS/Linux:
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
    *   En Windows:
        ```bash
        python -m venv venv
        .\venv\Scripts\activate
        ```
4.  **Instala las dependencias:**
    ```bash
    pip install -r requirements.txt
    ```
5.  **Inicializa la base de datos:**
    (Asegúrate de que tu entorno virtual esté activado)
    ```bash
    flask init-db
    ```
    Esto creará un archivo `suegra_app.db` en la carpeta raíz del proyecto. Solo necesitas hacerlo la primera vez.

## Ejecutar la Aplicación

1.  **Inicia el servidor Flask:**
    ```bash
    flask run
    ```
    O, si quieres que sea accesible en tu red local (por ejemplo, desde una tablet en la misma WiFi):
    ```bash
    flask run --host=0.0.0.0
    ```
    (Si usas `python app.py` directamente, puedes cambiar `app.run(debug=True)` a `app.run(host='0.0.0.0', port=5000)` o el puerto que desees).

2.  **Abre la aplicación en tu navegador:**
    Ve a `http://127.0.0.1:5000` (o la IP de tu máquina en el puerto 5000 si usaste `host=0.0.0.0`).

## Características

*   **Lista de Tareas:**
    *   Añadir tareas escribiendo o dictando por voz (botón 🎤).
    *   Marcar tareas como completadas/pendientes (botón ✔️/🔄).
    *   Eliminar tareas (botón 🗑️).
    *   Escuchar la descripción de una tarea (botón 🔊).
*   **Interfaz Simple y Amigable:** Diseñada para ser fácil de usar.

## Solución de Problemas

*   **El micrófono no funciona / "Permiso denegado":**
    *   Asegúrate de que tu navegador tiene permiso para acceder al micrófono. Generalmente, el navegador te lo pregunta la primera vez.
    *   Verifica la configuración de privacidad de tu sistema operativo para el micrófono.
    *   La Web Speech API requiere una conexión segura (HTTPS) cuando no se usa en `localhost`. Si despliegas esto en un servidor real, necesitarás HTTPS.
*   **Error `sqlite3.OperationalError: no such table: tasks`:**
    Significa que la base de datos no se inicializó correctamente o el archivo `suegra_app.db` no se encuentra/está corrupto. Ejecuta `flask init-db` de nuevo.

## Próximos Pasos (Ideas)

*   Módulo de Lista de Supermercado.
*   Módulo de Accesos Directos.
*   Recordatorios simples.
*   Personalización de colores/temas.
*   Autenticación (si es necesario).