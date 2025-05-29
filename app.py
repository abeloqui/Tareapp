from flask import Flask, render_template, request, jsonify, g, redirect, url_for
import sqlite3
import os
from datetime import date, datetime, time as dt_time # dt_time para la hora en medicamentos
import json # Para manejar los días en medicamentos

app = Flask(__name__)
app.config['DATABASE'] = os.path.join(app.root_path, 'suegra_app.db')

# --- Jinja2 Global Helpers ---
# Hacemos funciones y módulos útiles disponibles globalmente en las plantillas Jinja2
def today_iso_func():
    return date.today().isoformat()

def get_dias_semana_es_func(): # Renombrada para claridad
    return {"Mon": "Lun", "Tue": "Mar", "Wed": "Mié", "Thu": "Jue", "Fri": "Vie", "Sat": "Sáb", "Sun": "Dom"}

app.jinja_env.globals.update(
    datetime=datetime,      # <--- ESTA ES CRUCIAL PARA LA MACRO
    date=date,
    dt_time=dt_time,
    today_iso=today_iso_func,
    dias_semana_es=get_dias_semana_es_func,
    json_loads=json.loads
)

# --- Database Helpers ---
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(app.config['DATABASE'])
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()
    print("Base de datos inicializada.")

@app.cli.command('init-db')
def init_db_command():
    init_db()

# --- Main Routes ---
@app.route('/')
def dashboard():
    return render_template('index.html')

# --- TAREAS Module ---
@app.route('/tareas')
def tareas_page():
    db = get_db()
    cur = db.execute('SELECT id, description, is_done FROM tasks ORDER BY id DESC')
    tasks = cur.fetchall()
    return render_template('tareas.html', tasks=tasks)

@app.route('/tareas/add', methods=['POST'])
def add_task_route():
    description = request.form['description']
    if description:
        db = get_db()
        db.execute('INSERT INTO tasks (description) VALUES (?)', [description])
        db.commit()
        cur = db.execute('SELECT last_insert_rowid() AS id')
        task_id = cur.fetchone()['id']
        return jsonify({'status': 'success', 'message': 'Tarea añadida', 'task': {'id': task_id, 'description': description, 'is_done': 0}})
    return jsonify({'status': 'error', 'message': 'Descripción vacía'}), 400

@app.route('/tareas/toggle/<int:task_id>', methods=['POST'])
def toggle_task_route(task_id):
    db = get_db()
    cur = db.execute('SELECT is_done FROM tasks WHERE id = ?', [task_id])
    task = cur.fetchone()
    if task:
        new_status = 0 if task['is_done'] else 1
        db.execute('UPDATE tasks SET is_done = ? WHERE id = ?', [new_status, task_id])
        db.commit()
        return jsonify({'status': 'success', 'new_status': new_status})
    return jsonify({'status': 'error', 'message': 'Tarea no encontrada'}), 404

@app.route('/tareas/delete/<int:task_id>', methods=['POST'])
def delete_task_route(task_id):
    db = get_db()
    db.execute('DELETE FROM tasks WHERE id = ?', [task_id])
    db.commit()
    if db.total_changes > 0:
        return jsonify({'status': 'success', 'message': 'Tarea eliminada'})
    return jsonify({'status': 'error', 'message': 'Tarea no encontrada o ya eliminada'}), 404

# --- COMPRAS Module ---
@app.route('/compras')
def compras_page():
    db = get_db()
    cur = db.execute('SELECT id, description, amount, category, date_created FROM gastos ORDER BY date_created DESC, id DESC')
    gastos = cur.fetchall()
    categories = ['Alimentos', 'Hogar', 'Salud', 'Servicios', 'Transporte', 'Ocio', 'Otro']
    return render_template('compras.html', gastos=gastos, categories=categories)

@app.route('/compras/add', methods=['POST'])
def add_gasto_route():
    description = request.form.get('description')
    amount_str = request.form.get('amount')
    category = request.form.get('category')
    gasto_date_str = request.form.get('gasto_date') or date.today().isoformat()

    if not description:
        return jsonify({'status': 'error', 'message': 'La descripción es obligatoria.'}), 400

    amount = None
    if amount_str:
        try:
            amount = float(amount_str.replace(',', '.'))
        except ValueError:
            return jsonify({'status': 'error', 'message': 'El monto debe ser un número válido.'}), 400

    db = get_db()
    db.execute('INSERT INTO gastos (description, amount, category, date_created) VALUES (?, ?, ?, ?)',
               [description, amount, category, gasto_date_str])
    db.commit()
    cur = db.execute('SELECT last_insert_rowid() AS id')
    gasto_id = cur.fetchone()['id']
    
    new_gasto = {
        'id': gasto_id,
        'description': description,
        'amount': amount,
        'category': category,
        'date_created': gasto_date_str
    }
    return jsonify({'status': 'success', 'message': 'Gasto añadido', 'gasto': new_gasto})

@app.route('/compras/delete/<int:gasto_id>', methods=['POST'])
def delete_gasto_route(gasto_id):
    db = get_db()
    db.execute('DELETE FROM gastos WHERE id = ?', [gasto_id])
    db.commit()
    if db.total_changes > 0:
        return jsonify({'status': 'success', 'message': 'Gasto eliminado'})
    return jsonify({'status': 'error', 'message': 'Gasto no encontrado'}), 404

# --- MEDICAMENTOS Module ---
@app.route('/medicamentos')
def medicamentos_page():
    db = get_db()
    
    hoy_dia_semana_en = date.today().strftime('%a') # ej: "Mon", "Tue" para DB
    
    query_all_active = """
        SELECT id, name, time, days, frequency_type, last_taken, is_active
        FROM recordatorios WHERE is_active = 1 ORDER BY time ASC
    """
    todos_recordatorios_activos_db = db.execute(query_all_active).fetchall()

    recordatorios_de_hoy = []
    for r_db in todos_recordatorios_activos_db:
        es_para_hoy = False
        if r_db['frequency_type'] == 'todos':
            es_para_hoy = True
        elif r_db['frequency_type'] == 'una_vez' and r_db['days'] == date.today().isoformat():
            es_para_hoy = True
        elif r_db['frequency_type'] == 'especificos' and r_db['days']:
            dias_programados = r_db['days'].split(',')
            if hoy_dia_semana_en in dias_programados: # Comparar con formato de DB ('Mon', 'Tue')
                es_para_hoy = True
        
        if es_para_hoy:
            tomado_hoy_esta_toma = False
            if r_db['last_taken']:
                try:
                    last_taken_dt = datetime.strptime(r_db['last_taken'], '%Y-%m-%d %H:%M:%S')
                    if last_taken_dt.date() == date.today():
                        # Lógica simplificada: si hay una marca de 'tomado' hoy, se considera tomado para cualquier recordatorio de hoy.
                        # Una lógica más fina podría comparar la hora de 'last_taken' con r_db['time'].
                        tomado_hoy_esta_toma = True 
                except ValueError:
                    pass 
            recordatorios_de_hoy.append({**r_db, 'tomado_hoy': tomado_hoy_esta_toma})

    cur_all_gestion = db.execute('SELECT * FROM recordatorios ORDER BY name ASC')
    todos_los_recordatorios_gestion = cur_all_gestion.fetchall()

    # Para el formulario de añadir recordatorio
    dias_semana_select_form = [ 
        {"value": "Mon", "label": "Lunes"}, {"value": "Tue", "label": "Martes"},
        {"value": "Wed", "label": "Miércoles"}, {"value": "Thu", "label": "Jueves"},
        {"value": "Fri", "label": "Viernes"}, {"value": "Sat", "label": "Sábado"},
        {"value": "Sun", "label": "Domingo"}
    ]

    return render_template('medicamentos.html',
                           recordatorios_hoy=recordatorios_de_hoy,
                           recordatorios_gestion=todos_los_recordatorios_gestion,
                           dias_semana_select=dias_semana_select_form) # Pasando la variable correcta


@app.route('/medicamentos/add', methods=['POST'])
def add_recordatorio_route():
    name = request.form.get('name')
    time_str = request.form.get('time') 
    frequency_type = request.form.get('frequency_type')
    
    days_data = None
    if frequency_type == 'especificos':
        selected_days = request.form.getlist('days_specific[]') # ej: ["Mon", "Wed"]
        if selected_days:
            days_data = ",".join(selected_days)
    elif frequency_type == 'una_vez':
        days_data = request.form.get('date_once') # YYYY-MM-DD

    is_active = 1 if request.form.get('is_active') == '1' else 0 # Asegurar que '1' es el valor del checkbox

    if not name or not time_str or not frequency_type:
        # Idealmente, usar flash messages si es un redirect, o JSON si es AJAX
        return "Error: Faltan campos obligatorios", 400 # Simplificado

    db = get_db()
    try:
        db.execute(
            'INSERT INTO recordatorios (name, time, frequency_type, days, is_active) VALUES (?, ?, ?, ?, ?)',
            [name, time_str, frequency_type, days_data, is_active]
        )
        db.commit()
        return redirect(url_for('medicamentos_page'))
    except sqlite3.Error as e:
        print(f"Error al añadir recordatorio: {e}")
        return "Error al guardar el recordatorio en la base de datos", 500 # Simplificado

@app.route('/medicamentos/toggle_active/<int:recordatorio_id>', methods=['POST'])
def toggle_recordatorio_active(recordatorio_id):
    db = get_db()
    cur = db.execute('SELECT is_active FROM recordatorios WHERE id = ?', [recordatorio_id])
    recordatorio = cur.fetchone()
    if recordatorio:
        new_status = 0 if recordatorio['is_active'] else 1
        db.execute('UPDATE recordatorios SET is_active = ? WHERE id = ?', [new_status, recordatorio_id])
        db.commit()
        return jsonify({'status': 'success', 'new_status': new_status})
    return jsonify({'status': 'error', 'message': 'Recordatorio no encontrado'}), 404

@app.route('/medicamentos/delete/<int:recordatorio_id>', methods=['POST'])
def delete_recordatorio_route(recordatorio_id):
    db = get_db()
    db.execute('DELETE FROM recordatorios WHERE id = ?', [recordatorio_id])
    db.commit()
    if db.total_changes > 0:
        return jsonify({'status': 'success', 'message': 'Recordatorio eliminado'})
    return jsonify({'status': 'error', 'message': 'Recordatorio no encontrado'}), 404

@app.route('/medicamentos/mark_taken/<int:recordatorio_id>', methods=['POST'])
def mark_recordatorio_taken(recordatorio_id):
    db = get_db()
    now_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.execute('UPDATE recordatorios SET last_taken = ? WHERE id = ?', [now_timestamp, recordatorio_id])
    db.commit()
    if db.total_changes > 0:
        return jsonify({'status': 'success', 'message': 'Marcado como tomado', 'last_taken': now_timestamp})
    return jsonify({'status': 'error', 'message': 'Recordatorio no encontrado'}), 404

@app.route('/turnos')
def turnos_page():
    db = get_db()
    # Obtener turnos pendientes, ordenados por fecha y hora
    # Filtramos solo los que son hoy o en el futuro y están pendientes
    today_iso = date.today().isoformat()
    cur = db.execute(
        "SELECT * FROM turnos_medicos WHERE date >= ? AND status = 'pendiente' ORDER BY date ASC, time ASC",
        [today_iso]
    )
    proximos_turnos = cur.fetchall()

    # (Opcional) Obtener historial de turnos
    # cur_historial = db.execute("SELECT * FROM turnos_medicos WHERE date < ? OR status != 'pendiente' ORDER BY date DESC, time DESC", [today_iso])
    # historial_turnos = cur_historial.fetchall()
    historial_turnos = [] # Placeholder por ahora

    return render_template('turnos.html',
                           proximos_turnos=proximos_turnos,
                           historial_turnos=historial_turnos)

@app.route('/turnos/add', methods=['POST'])
def add_turno_route():
    description = request.form.get('description')
    turno_date = request.form.get('turno_date') # YYYY-MM-DD
    turno_time = request.form.get('turno_time') # HH:MM
    address = request.form.get('address')
    notes = request.form.get('notes')

    if not description or not turno_date or not turno_time:
        # Manejar error - Idealmente con flash messages o respuesta JSON
        return "Error: Descripción, fecha y hora son obligatorios.", 400

    db = get_db()
    try:
        db.execute(
            "INSERT INTO turnos_medicos (description, date, time, address, notes) VALUES (?, ?, ?, ?, ?)",
            [description, turno_date, turno_time, address, notes]
        )
        db.commit()
        return redirect(url_for('turnos_page'))
    except sqlite3.Error as e:
        print(f"Error al añadir turno: {e}")
        return "Error al guardar el turno en la base de datos", 500

@app.route('/turnos/update_status/<int:turno_id>', methods=['POST'])
def update_turno_status_route(turno_id):
    new_status = request.form.get('status') # 'realizado', 'cancelado'
    if not new_status or new_status not in ['realizado', 'cancelado', 'pendiente']:
        return jsonify({'status': 'error', 'message': 'Estado no válido'}), 400

    db = get_db()
    db.execute("UPDATE turnos_medicos SET status = ? WHERE id = ?", [new_status, turno_id])
    db.commit()

    if db.total_changes > 0:
        return jsonify({'status': 'success', 'message': f'Turno marcado como {new_status}'})
    return jsonify({'status': 'error', 'message': 'Turno no encontrado'}), 404
    
@app.route('/turnos/delete/<int:turno_id>', methods=['POST']) # Si decides añadirlo
def delete_turno_route(turno_id):
    db = get_db()
    db.execute("DELETE FROM turnos_medicos WHERE id = ?", [turno_id])
    db.commit()
    if db.total_changes > 0:
        return jsonify({'status': 'success', 'message': 'Turno eliminado'})
    return jsonify({'status': 'error', 'message': 'Turno no encontrado'}), 404



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)