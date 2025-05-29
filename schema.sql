DROP TABLE IF EXISTS tasks;
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0 -- 0 for false, 1 for true
);

DROP TABLE IF EXISTS gastos;
CREATE TABLE gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  amount REAL, -- Puede ser NULL si no se especifica
  category TEXT, -- Ej: 'Alimentos', 'Hogar', 'Salud', 'Servicios', 'Otro'
  date_created TEXT NOT NULL -- Guardar como TEXT en formato YYYY-MM-DD
);

DROP TABLE IF EXISTS recordatorios;
CREATE TABLE recordatorios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    time TEXT NOT NULL, -- HH:MM
    days TEXT, -- Lista de días separada por comas: "lun,mar,mie" o "todos" o NULL si es una vez
    last_taken TEXT, -- YYYY-MM-DD HH:MM, para saber cuándo fue la última vez que se marcó
    is_active INTEGER NOT NULL DEFAULT 1
);

-- Podrías añadir tablas para Contactos, Rutinas, etc. más adelante
-- DROP TABLE IF EXISTS contactos;
-- CREATE TABLE contactos (
--   id INTEGER PRIMARY KEY AUTOINCREMENT,
--   name TEXT NOT NULL,
--   phone TEXT,
--   photo_path TEXT -- opcional
-- );
-- ... (tus tablas existentes: tasks, gastos, recordatorios) ...

DROP TABLE IF EXISTS turnos_medicos;
CREATE TABLE turnos_medicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,      -- Especialidad, Médico, Lugar
    date TEXT NOT NULL,             -- Fecha en formato YYYY-MM-DD
    time TEXT NOT NULL,             -- Hora en formato HH:MM
    address TEXT,                   -- Dirección (opcional)
    notes TEXT,                     -- Notas adicionales (opcional)
    status TEXT DEFAULT 'pendiente' -- 'pendiente', 'realizado', 'cancelado'
);