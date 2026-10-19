-- ===============================================================================
-- Script de creación y volcado para Supabase (PostgreSQL)
-- Convertido fielmente a partir de datos_practica_distribuidos.sql (MariaDB)
-- ===============================================================================

-- 1. Categorías
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);

INSERT INTO categorias (id, nombre) VALUES
(1, 'Ecógrafos'),
(2, 'Pulsioxímetros'),
(3, 'Bombas de infusión')
ON CONFLICT (id) DO NOTHING;

-- 2. Gestores
CREATE TABLE IF NOT EXISTS gestores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  apellidos VARCHAR(50) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(50) NOT NULL
);

INSERT INTO gestores (id, nombre, apellidos, usuario, password) VALUES
(1, 'Samuel', 'De Luque', 'sdl', '4'),
(2, 'Roberto', 'Doblas', 'rd', '5')
ON CONFLICT (id) DO NOTHING;

-- 3. Ubicaciones
CREATE TABLE IF NOT EXISTS ubicaciones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL
);

INSERT INTO ubicaciones (id, nombre) VALUES
(1, 'Sala de Urgencias'),
(2, 'Laboratorio Central'),
(3, 'Almacén Principal')
ON CONFLICT (id) DO NOTHING;

-- 4. Sanitarios
CREATE TABLE IF NOT EXISTS sanitarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  apellidos VARCHAR(50) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(50) NOT NULL
);

INSERT INTO sanitarios (id, nombre, apellidos, usuario, password) VALUES
(1, 'Marina', 'Sánchez Rocamora', 'msr', '1'),
(2, 'Marcos', 'Agullo Perez', 'map', '2'),
(3, 'Victor', 'Sánchez Auñón', 'vsa', '3'),
(4, 'Son', 'Goy', 'pru', '12')
ON CONFLICT (id) DO NOTHING;

-- 5. Modelos
CREATE TABLE IF NOT EXISTS modelos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  categoria INT NOT NULL REFERENCES categorias(id),
  horas_maximas INT NOT NULL
);

INSERT INTO modelos (id, nombre, categoria, horas_maximas) VALUES
(1, 'Ecógrafo Doppler SonoScan v4', 1, 24),
(2, 'Pulsioxímetro SatuMax 200', 2, 48),
(3, 'Bomba de Infusión Continua FlowMaster', 3, 72),
(4, 'Ecógrafo Portátil PocketView', 1, 12)
ON CONFLICT (id) DO NOTHING;

-- 6. Recursos
CREATE TABLE IF NOT EXISTS recursos (
  id SERIAL PRIMARY KEY,
  modelo INT NOT NULL REFERENCES modelos(id),
  ubicacion INT NOT NULL REFERENCES ubicaciones(id),
  numero_serie VARCHAR(50) NOT NULL,
  estado INT NOT NULL
);

INSERT INTO recursos (id, modelo, ubicacion, numero_serie, estado) VALUES
(1, 1, 1, 'ECO-001-2025', 1),
(2, 2, 2, 'PUL-045-2025', 2),
(3, 3, 3, 'BOM-210-2025', 0),
(4, 1, 2, 'ECO-002-2025', 0),
(5, 1, 3, 'ECO-003-2026', 0),
(6, 2, 1, 'PUL-046-2026', 0),
(7, 2, 3, 'PUL-047-2026', 0),
(8, 3, 1, 'BOM-211-2026', 0),
(9, 1, 1, 'ECP-500-2026', 0),
(10, 1, 2, 'ECP-501-2026', 0),
(11, 1, 3, 'ECP-502-2026', 0),
(12, 1, 1, 'PRUEBA-SQL-001', 0)
ON CONFLICT (id) DO NOTHING;

-- 7. Reservas
CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  recurso INT NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
  sanitario INT NOT NULL REFERENCES sanitarios(id),
  horas_estimadas INT NOT NULL,
  fecha_peticion TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_inicio TIMESTAMP NULL,
  fecha_fin TIMESTAMP NULL
);

INSERT INTO reservas (id, recurso, sanitario, horas_estimadas, fecha_peticion, fecha_inicio, fecha_fin) VALUES
(1, 1, 1, 2, '2026-02-21 10:00:00', '2026-02-21 11:00:00', '2026-02-21 13:00:00'),
(2, 2, 2, 4, '2026-02-21 14:00:00', '2026-02-21 15:00:00', NULL),
(3, 1, 1, 2, '2026-02-21 20:00:00', NULL, NULL),
(4, 3, 2, 1, '2026-02-17 12:30:00', NULL, NULL),
(5, 3, 3, 4, '2026-02-22 08:15:00', '2026-02-22 09:00:00', '2026-02-22 13:00:00')
ON CONFLICT (id) DO NOTHING;

-- 8. Reseñas
CREATE TABLE IF NOT EXISTS resenyas (
  id SERIAL PRIMARY KEY,
  recurso INT NOT NULL REFERENCES recursos(id) ON DELETE CASCADE,
  sanitario INT NOT NULL REFERENCES sanitarios(id),
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valor INT NOT NULL,
  descripcion VARCHAR(100) NOT NULL
);

INSERT INTO resenyas (id, recurso, sanitario, fecha, valor, descripcion) VALUES
(1, 1, 1, '2026-02-15 16:00:00', 5, 'La pantalla se ve muy nítida, aunque tardó un poco en calibrar.'),
(2, 1, 2, '2026-02-14 18:30:00', 5, 'Medición rápida y muy precisa. Excelente estado.'),
(3, 3, 3, '2026-02-10 11:00:00', 5, 'Tiene la batería bastante desgastada, dura menos de lo esperado.'),
(4, 1, 2, '2026-02-13 18:30:00', 5, 'Se apaga solo a los pocos minutos de encenderlo.')
ON CONFLICT (id) DO NOTHING;

-- Sincronizar secuencias de auto-incremento para los nuevos inserts
SELECT setval('categorias_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categorias));
SELECT setval('gestores_id_seq', (SELECT COALESCE(MAX(id), 1) FROM gestores));
SELECT setval('modelos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM modelos));
SELECT setval('ubicaciones_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ubicaciones));
SELECT setval('sanitarios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sanitarios));
SELECT setval('recursos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recursos));
SELECT setval('reservas_id_seq', (SELECT COALESCE(MAX(id), 1) FROM reservas));
SELECT setval('resenyas_id_seq', (SELECT COALESCE(MAX(id), 1) FROM resenyas));

