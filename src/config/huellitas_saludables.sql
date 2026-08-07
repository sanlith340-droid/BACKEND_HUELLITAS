-- ============================================================================
-- HUELLITAS SALUDABLES — Script de Base de Datos (PostgreSQL 15+)
-- Incluye: tipos ENUM, DDL, índices, triggers de integridad de rol,
--          datos de prueba y consultas SQL de validación.
-- ============================================================================

-- ============================================================================
-- 0. LIMPIEZA (idempotencia en ambientes de prueba)
-- ============================================================================
DROP SCHEMA IF EXISTS huellitas CASCADE;
CREATE SCHEMA huellitas;
SET search_path TO huellitas;

-- ============================================================================
-- 1. TIPOS ENUM
-- ============================================================================
CREATE TYPE tipo_usuario_enum      AS ENUM ('dueno','veterinario','cuidador','agendador','admin');
CREATE TYPE tipo_servicio_enum     AS ENUM ('veterinario','cuidado');
CREATE TYPE estado_servicio_enum   AS ENUM ('pendiente','activo','finalizado','cancelado');
CREATE TYPE tipo_notificacion_enum AS ENUM ('cita','cuidado','pago','sistema');
CREATE TYPE canal_envio_enum       AS ENUM ('email','sms','push');
CREATE TYPE tipo_actividad_enum    AS ENUM ('alimentacion','paseo','medicamento','higiene','juego');
CREATE TYPE tipo_incidente_enum    AS ENUM ('salud','comportamiento','escape','otro');
CREATE TYPE gravedad_enum          AS ENUM ('baja','media','alta');

-- ============================================================================
-- 2. TABLAS (orden que respeta las dependencias de FK)
-- ============================================================================

-- 2.1 USUARIO ----------------------------------------------------------------
CREATE TABLE usuario (
    id_usuario      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    primer_nombre   varchar(60)  NOT NULL,
    apellido        varchar(60)  NOT NULL,
    email           varchar(150) NOT NULL,
    contrasena      varchar(255) NOT NULL,
    tipo_usuario    tipo_usuario_enum NOT NULL,
    fecha_registro  timestamp NOT NULL DEFAULT now(),
    direccion       varchar(255),
    foto_perfil     varchar(255) NOT NULL,
    telefono        varchar(20),
    CONSTRAINT uq_usuario_email UNIQUE (email),
    CONSTRAINT ck_usuario_email_formato CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
COMMENT ON TABLE usuario IS 'Toda persona con acceso al sistema, sin importar su rol.';
COMMENT ON COLUMN usuario.telefono IS 'Número de contacto del usuario (opcional, un único número por usuario).';

-- 2.2 MASCOTA ------------------------------------------------------------------
CREATE TABLE mascota (
    id_mascota        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario        integer NOT NULL,
    nombre            varchar(80) NOT NULL,
    especie           varchar(50) NOT NULL,
    raza              varchar(80),
    fecha_nacimiento  date NOT NULL,
    peso_kg           numeric(5,2) NOT NULL,
    foto_mascota      varchar(255),
    CONSTRAINT fk_mascota_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ck_mascota_peso CHECK (peso_kg > 0)
);
COMMENT ON TABLE mascota IS 'Animales registrados por los dueños (rol dueno).';

-- 2.3 DISPONIBILIDAD ------------------------------------------------------------
CREATE TABLE disponibilidad (
    id_disponibilidad integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario        integer NOT NULL,
    fecha             date NOT NULL,
    hora_inicio       time NOT NULL,
    hora_fin          time NOT NULL,
    disponible        boolean NOT NULL DEFAULT true,
    CONSTRAINT fk_disponibilidad_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT ck_disponibilidad_horas CHECK (hora_fin > hora_inicio)
);
COMMENT ON TABLE disponibilidad IS 'Bloques horarios ofrecidos por un veterinario o cuidador.';

-- 2.4 SERVICIO --------------------------------------------------------------------
CREATE TABLE servicio (
    id_servicio             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_mascota              integer NOT NULL,
    id_usuario_solicitante  integer NOT NULL,
    id_usuario_proveedor    integer NOT NULL,
    id_usuario_registrador  integer NOT NULL,
    id_disponibilidad       integer,
    fecha                   timestamp NOT NULL,
    tipo_servicio           tipo_servicio_enum NOT NULL,
    estado                  estado_servicio_enum NOT NULL DEFAULT 'pendiente',
    costo                   numeric(10,2) NOT NULL,
    notas                   text,
    CONSTRAINT fk_servicio_mascota FOREIGN KEY (id_mascota)
        REFERENCES mascota (id_mascota) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_servicio_solicitante FOREIGN KEY (id_usuario_solicitante)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_servicio_proveedor FOREIGN KEY (id_usuario_proveedor)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_servicio_registrador FOREIGN KEY (id_usuario_registrador)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_servicio_disponibilidad FOREIGN KEY (id_disponibilidad)
        REFERENCES disponibilidad (id_disponibilidad) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_servicio_disponibilidad UNIQUE (id_disponibilidad),
    CONSTRAINT ck_servicio_costo CHECK (costo >= 0)
);
COMMENT ON TABLE servicio IS 'Solicitud de atención veterinaria o de cuidado/guardería.';

-- 2.5 CALIFICACION -----------------------------------------------------------------
CREATE TABLE calificacion (
    id_calificacion           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_servicio               integer NOT NULL,
    id_usuario                integer NOT NULL,
    puntuacion                smallint NOT NULL,
    comentario                text,
    fecha                     date NOT NULL,
    tipo_servicio_calificado  varchar(50) NOT NULL,
    CONSTRAINT fk_calificacion_servicio FOREIGN KEY (id_servicio)
        REFERENCES servicio (id_servicio) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_calificacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_calificacion_servicio UNIQUE (id_servicio),
    CONSTRAINT ck_calificacion_puntuacion CHECK (puntuacion BETWEEN 1 AND 5)
);
COMMENT ON TABLE calificacion IS 'Evaluación (1-5) que un dueño hace de un servicio recibido. tipo_servicio_calificado es una copia histórica intencional (desnormalización documentada, ver Sección 8.3 del informe).';

-- 2.6 NOTIFICACION -------------------------------------------------------------------
CREATE TABLE notificacion (
    id_notificacion  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario       integer NOT NULL,
    mensaje          varchar(300) NOT NULL,
    leida            boolean NOT NULL DEFAULT false,
    fecha_envio      timestamp NOT NULL DEFAULT now(),
    tipo             tipo_notificacion_enum NOT NULL,
    canal_envio      canal_envio_enum NOT NULL,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);
COMMENT ON TABLE notificacion IS 'Mensajes generados por el sistema hacia un usuario.';

-- 2.7 DIAGNOSTICO --------------------------------------------------------------------
CREATE TABLE diagnostico (
    id_diagnostico  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_mascota      integer NOT NULL,
    id_usuario      integer NOT NULL,
    fecha           date NOT NULL,
    diagnostico     text NOT NULL,
    tratamiento     text,
    observaciones   text,
    CONSTRAINT fk_diagnostico_mascota FOREIGN KEY (id_mascota)
        REFERENCES mascota (id_mascota) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_diagnostico_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
);
COMMENT ON TABLE diagnostico IS 'Resultado clínico de una atención veterinaria a una mascota.';

-- 2.8 CUIDADO_DIARIO -----------------------------------------------------------------
CREATE TABLE cuidado_diario (
    id_cuidado                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_mascota                 integer NOT NULL,
    id_usuario                 integer NOT NULL,
    fecha_hora                 timestamp NOT NULL,
    tipo_actividad              tipo_actividad_enum NOT NULL,
    descripcion                text NOT NULL,
    observaciones_especiales   text,
    CONSTRAINT fk_cuidado_mascota FOREIGN KEY (id_mascota)
        REFERENCES mascota (id_mascota) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cuidado_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
);
COMMENT ON TABLE cuidado_diario IS 'Actividades de cuidado realizadas a una mascota en guardería.';

-- 2.9 INCIDENTE -----------------------------------------------------------------------
CREATE TABLE incidente (
    id_incidente    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_mascota      integer NOT NULL,
    id_usuario      integer NOT NULL,
    fecha_hora      timestamp NOT NULL,
    tipo            tipo_incidente_enum NOT NULL,
    gravedad        gravedad_enum NOT NULL,
    descripcion     text NOT NULL,
    evidencia_foto  varchar(255),
    CONSTRAINT fk_incidente_mascota FOREIGN KEY (id_mascota)
        REFERENCES mascota (id_mascota) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_incidente_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
);
COMMENT ON TABLE incidente IS 'Eventos anómalos (salud, comportamiento, escape, etc.) sobre una mascota.';

-- 2.10 ESTANCIA ---------------------------------------------------------------------
CREATE TABLE estancia (
    id_estancia    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_mascota     integer NOT NULL,
    id_servicio    integer,
    fecha_entrada  timestamp NOT NULL,
    fecha_salida   timestamp,
    observaciones  text,
    CONSTRAINT fk_estancia_mascota FOREIGN KEY (id_mascota)
        REFERENCES mascota (id_mascota) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_estancia_servicio FOREIGN KEY (id_servicio)
        REFERENCES servicio (id_servicio) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT uq_estancia_servicio UNIQUE (id_servicio),
    CONSTRAINT ck_estancia_fechas CHECK (fecha_salida IS NULL OR fecha_salida > fecha_entrada)
);
COMMENT ON TABLE estancia IS 'Periodo de hospedaje de una mascota en guardería (entrada/salida).';

-- 2.11 AUDITORIA ----------------------------------------------------------------------
CREATE TABLE auditoria (
    id_auditoria       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario         integer NOT NULL,
    accion             varchar(150) NOT NULL,
    fecha_hora         timestamp NOT NULL DEFAULT now(),
    entidad_afectada   varchar(100) NOT NULL,
    detalle            text,
    ip_origen          varchar(45),
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE
);
COMMENT ON TABLE auditoria IS 'Traza de acciones ejecutadas por los usuarios en el sistema.';

-- ============================================================================
-- 3. ÍNDICES (más allá de PK / UNIQUE, que ya generan índice implícito)
-- ============================================================================
CREATE INDEX ix_mascota_id_usuario            ON mascota (id_usuario);

CREATE INDEX ix_servicio_mascota              ON servicio (id_mascota);
CREATE INDEX ix_servicio_solicitante          ON servicio (id_usuario_solicitante);
CREATE INDEX ix_servicio_proveedor            ON servicio (id_usuario_proveedor);
CREATE INDEX ix_servicio_registrador          ON servicio (id_usuario_registrador);
CREATE INDEX ix_servicio_estado               ON servicio (estado);
CREATE INDEX ix_servicio_fecha                ON servicio (fecha);
CREATE INDEX ix_servicio_tipo_estado          ON servicio (tipo_servicio, estado);

CREATE INDEX ix_disponibilidad_usuario_fecha  ON disponibilidad (id_usuario, fecha);
CREATE INDEX ix_disponibilidad_disponible     ON disponibilidad (disponible) WHERE disponible = true;

CREATE INDEX ix_calificacion_usuario          ON calificacion (id_usuario);

CREATE INDEX ix_notificacion_usuario_leida    ON notificacion (id_usuario, leida);

CREATE INDEX ix_diagnostico_mascota           ON diagnostico (id_mascota);
CREATE INDEX ix_diagnostico_usuario           ON diagnostico (id_usuario);

CREATE INDEX ix_cuidado_mascota               ON cuidado_diario (id_mascota);
CREATE INDEX ix_cuidado_usuario               ON cuidado_diario (id_usuario);
CREATE INDEX ix_cuidado_fecha_hora            ON cuidado_diario (fecha_hora);

CREATE INDEX ix_incidente_mascota             ON incidente (id_mascota);
CREATE INDEX ix_incidente_gravedad            ON incidente (gravedad);

CREATE INDEX ix_estancia_mascota              ON estancia (id_mascota);
CREATE INDEX ix_estancia_activa               ON estancia (id_mascota) WHERE fecha_salida IS NULL;

CREATE INDEX ix_auditoria_usuario             ON auditoria (id_usuario);
CREATE INDEX ix_auditoria_fecha_hora          ON auditoria (fecha_hora);
CREATE INDEX ix_auditoria_entidad             ON auditoria (entidad_afectada);

-- ============================================================================
-- 4. TRIGGERS DE INTEGRIDAD DE ROL (reglas de negocio no expresables en CHECK)
-- ============================================================================

-- 4.1 El proveedor de un SERVICIO debe tener el rol acorde a tipo_servicio
CREATE OR REPLACE FUNCTION huellitas.validar_rol_proveedor_servicio()
RETURNS trigger AS $$
DECLARE
    v_rol tipo_usuario_enum;
BEGIN
    SELECT tipo_usuario INTO v_rol FROM usuario WHERE id_usuario = NEW.id_usuario_proveedor;

    IF NEW.tipo_servicio = 'veterinario' AND v_rol <> 'veterinario' THEN
        RAISE EXCEPTION 'El usuario proveedor (id=%) debe tener rol veterinario para un servicio veterinario', NEW.id_usuario_proveedor;
    ELSIF NEW.tipo_servicio = 'cuidado' AND v_rol <> 'cuidador' THEN
        RAISE EXCEPTION 'El usuario proveedor (id=%) debe tener rol cuidador para un servicio de cuidado', NEW.id_usuario_proveedor;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_rol_proveedor_servicio
    BEFORE INSERT OR UPDATE OF id_usuario_proveedor, tipo_servicio ON servicio
    FOR EACH ROW EXECUTE FUNCTION huellitas.validar_rol_proveedor_servicio();

-- 4.2 El dueño de una MASCOTA debe tener rol 'dueno'
CREATE OR REPLACE FUNCTION huellitas.validar_rol_dueno_mascota()
RETURNS trigger AS $$
DECLARE
    v_rol tipo_usuario_enum;
BEGIN
    SELECT tipo_usuario INTO v_rol FROM usuario WHERE id_usuario = NEW.id_usuario;
    IF v_rol <> 'dueno' THEN
        RAISE EXCEPTION 'El usuario (id=%) debe tener rol dueno para registrar una mascota', NEW.id_usuario;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_rol_dueno_mascota
    BEFORE INSERT OR UPDATE OF id_usuario ON mascota
    FOR EACH ROW EXECUTE FUNCTION huellitas.validar_rol_dueno_mascota();

-- 4.3 El proveedor de un bloque de DISPONIBILIDAD debe ser veterinario o cuidador
CREATE OR REPLACE FUNCTION huellitas.validar_rol_disponibilidad()
RETURNS trigger AS $$
DECLARE
    v_rol tipo_usuario_enum;
BEGIN
    SELECT tipo_usuario INTO v_rol FROM usuario WHERE id_usuario = NEW.id_usuario;
    IF v_rol NOT IN ('veterinario','cuidador') THEN
        RAISE EXCEPTION 'El usuario (id=%) debe tener rol veterinario o cuidador para definir disponibilidad', NEW.id_usuario;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_rol_disponibilidad
    BEFORE INSERT OR UPDATE OF id_usuario ON disponibilidad
    FOR EACH ROW EXECUTE FUNCTION huellitas.validar_rol_disponibilidad();

-- 4.4 El autor de un DIAGNOSTICO debe tener rol 'veterinario'
CREATE OR REPLACE FUNCTION huellitas.validar_rol_diagnostico()
RETURNS trigger AS $$
DECLARE
    v_rol tipo_usuario_enum;
BEGIN
    SELECT tipo_usuario INTO v_rol FROM usuario WHERE id_usuario = NEW.id_usuario;
    IF v_rol <> 'veterinario' THEN
        RAISE EXCEPTION 'El usuario (id=%) debe tener rol veterinario para registrar un diagnóstico', NEW.id_usuario;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_rol_diagnostico
    BEFORE INSERT OR UPDATE OF id_usuario ON diagnostico
    FOR EACH ROW EXECUTE FUNCTION huellitas.validar_rol_diagnostico();

-- 4.5 El autor de un CUIDADO_DIARIO debe tener rol 'cuidador'
CREATE OR REPLACE FUNCTION huellitas.validar_rol_cuidado()
RETURNS trigger AS $$
DECLARE
    v_rol tipo_usuario_enum;
BEGIN
    SELECT tipo_usuario INTO v_rol FROM usuario WHERE id_usuario = NEW.id_usuario;
    IF v_rol <> 'cuidador' THEN
        RAISE EXCEPTION 'El usuario (id=%) debe tener rol cuidador para registrar cuidado diario', NEW.id_usuario;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_rol_cuidado
    BEFORE INSERT OR UPDATE OF id_usuario ON cuidado_diario
    FOR EACH ROW EXECUTE FUNCTION huellitas.validar_rol_cuidado();

-- 4.6 Al reservar un bloque de DISPONIBILIDAD desde SERVICIO, marcarlo como no disponible
CREATE OR REPLACE FUNCTION huellitas.marcar_disponibilidad_ocupada()
RETURNS trigger AS $$
BEGIN
    IF NEW.id_disponibilidad IS NOT NULL THEN
        UPDATE disponibilidad SET disponible = false WHERE id_disponibilidad = NEW.id_disponibilidad;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.id_disponibilidad IS NOT NULL
       AND OLD.id_disponibilidad IS DISTINCT FROM NEW.id_disponibilidad THEN
        UPDATE disponibilidad SET disponible = true WHERE id_disponibilidad = OLD.id_disponibilidad;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_marcar_disponibilidad_ocupada
    AFTER INSERT OR UPDATE OF id_disponibilidad ON servicio
    FOR EACH ROW EXECUTE FUNCTION huellitas.marcar_disponibilidad_ocupada();

-- 4.7 Congelar tipo_servicio_calificado al insertar CALIFICACION (snapshot histórico)
CREATE OR REPLACE FUNCTION huellitas.snapshot_tipo_servicio_calificacion()
RETURNS trigger AS $$
BEGIN
    IF NEW.tipo_servicio_calificado IS NULL THEN
        SELECT tipo_servicio::text INTO NEW.tipo_servicio_calificado
        FROM servicio WHERE id_servicio = NEW.id_servicio;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_snapshot_tipo_servicio
    BEFORE INSERT ON calificacion
    FOR EACH ROW EXECUTE FUNCTION huellitas.snapshot_tipo_servicio_calificacion();

-- ============================================================================
-- 5. DATOS DE PRUEBA
-- ============================================================================

-- 5.1 Usuarios (3 dueños, 2 veterinarios, 2 cuidadores, 1 agendador, 1 admin)
INSERT INTO usuario (primer_nombre, apellido, email, contrasena, tipo_usuario, direccion, foto_perfil, telefono) VALUES
('Camila',   'Rojas',    'camila.rojas@correo.com',   '$2b$12$hashdemo1', 'dueno',       'Cra 10 # 20-30, Bogotá', '/img/perfil/1.png', '3001112233'),
('Andrés',   'Pardo',    'andres.pardo@correo.com',   '$2b$12$hashdemo2', 'dueno',       'Cl 45 # 12-05, Medellín', '/img/perfil/2.png', '3002223344'),
('Lucía',    'Gómez',    'lucia.gomez@correo.com',    '$2b$12$hashdemo3', 'dueno',       NULL, '/img/perfil/3.png', NULL),
('Daniel',   'Vargas',   'daniel.vargas@vet.com',     '$2b$12$hashdemo4', 'veterinario', 'Cl 80 # 9-15, Bogotá', '/img/perfil/4.png', '3004445566'),
('Marcela',  'Suárez',   'marcela.suarez@vet.com',    '$2b$12$hashdemo5', 'veterinario', NULL, '/img/perfil/5.png', '3005556677'),
('Julián',   'Torres',   'julian.torres@cuidado.com', '$2b$12$hashdemo6', 'cuidador',    NULL, '/img/perfil/6.png', '3006667788'),
('Paula',    'Mendoza',  'paula.mendoza@cuidado.com', '$2b$12$hashdemo7', 'cuidador',    NULL, '/img/perfil/7.png', '3007778899'),
('Felipe',   'Castaño',  'felipe.castano@huellitas.com','$2b$12$hashdemo8','agendador',  'Cl 100 # 15-20, Bogotá', '/img/perfil/8.png', '3008889900'),
('Sandra',   'Reyes',    'sandra.reyes@huellitas.com','$2b$12$hashdemo9', 'admin',       NULL, '/img/perfil/9.png', '3009990011');

-- 5.2 Mascotas
INSERT INTO mascota (id_usuario, nombre, especie, raza, fecha_nacimiento, peso_kg, foto_mascota) VALUES
(1, 'Rocky',   'Perro', 'Labrador',       '2021-03-14', 28.50, '/img/mascota/rocky.png'),
(1, 'Michi',   'Gato',  'Mestizo',        '2022-07-01',  4.20, NULL),
(2, 'Luna',    'Perro', 'Golden Retriever','2020-11-20', 30.00, '/img/mascota/luna.png'),
(3, 'Toby',    'Perro', NULL,             '2023-01-05',  9.80, NULL),
(3, 'Kiwi',    'Ave',   'Periquito',      '2023-05-10',  0.05, NULL);

-- 5.3 Disponibilidad (bloques de vet y cuidadores)
INSERT INTO disponibilidad (id_usuario, fecha, hora_inicio, hora_fin, disponible) VALUES
(4, '2026-08-10', '08:00', '09:00', true),
(4, '2026-08-10', '09:00', '10:00', true),
(5, '2026-08-11', '14:00', '15:00', true),
(6, '2026-08-10', '07:00', '19:00', true),
(7, '2026-08-12', '07:00', '19:00', true);

-- 5.4 Servicios (referencian disponibilidad; el trigger marca disponible=false)
INSERT INTO servicio (id_mascota, id_usuario_solicitante, id_usuario_proveedor, id_usuario_registrador, id_disponibilidad, fecha, tipo_servicio, estado, costo, notas) VALUES
(1, 1, 4, 1, 1, '2026-08-10 08:00', 'veterinario', 'finalizado', 120000.00, 'Consulta general y vacunación.'),
(3, 2, 5, 8, 3, '2026-08-11 14:00', 'veterinario', 'activo',      95000.00, 'Revisión de dermatitis.'),
(4, 3, 6, 3, 4, '2026-08-10 07:00', 'cuidado',     'finalizado',  60000.00, 'Guardería de un día.'),
(2, 1, 4, 1, 2, '2026-08-10 09:00', 'veterinario', 'pendiente',  110000.00, NULL),
(5, 3, 7, 8, 5, '2026-08-12 07:00', 'cuidado',     'activo',      50000.00, 'Estancia con alimentación especial.');

-- 5.5 Calificaciones (solo de servicios finalizados; tipo_servicio_calificado se autocompleta por trigger)
INSERT INTO calificacion (id_servicio, id_usuario, puntuacion, comentario, fecha, tipo_servicio_calificado) VALUES
(1, 1, 5, 'Excelente atención, muy puntual.', '2026-08-10', NULL),
(3, 3, 4, 'Buen cuidado, Toby volvió feliz.',  '2026-08-10', NULL);

-- 5.6 Notificaciones
INSERT INTO notificacion (id_usuario, mensaje, leida, tipo, canal_envio) VALUES
(1, 'Tu cita veterinaria para Rocky fue confirmada.', true,  'cita', 'email'),
(1, 'Nueva calificación registrada, ¡gracias!',       false, 'sistema', 'push'),
(2, 'Tu cita veterinaria para Luna está pendiente de confirmación.', false, 'cita', 'sms'),
(3, 'Toby ha finalizado su estancia en guardería.',   true,  'cuidado', 'email'),
(4, 'Tienes una nueva cita asignada.',                false, 'cita', 'push');

-- 5.7 Diagnósticos
INSERT INTO diagnostico (id_mascota, id_usuario, fecha, diagnostico, tratamiento, observaciones) VALUES
(1, 4, '2026-08-10', 'Otitis leve en oído derecho.', 'Limpieza semanal y gotas óticas por 7 días.', 'Revisión de control en 2 semanas.'),
(3, 5, '2026-08-11', 'Dermatitis alérgica.', 'Baño medicado y antihistamínico.', NULL);

-- 5.8 Cuidado diario
INSERT INTO cuidado_diario (id_mascota, id_usuario, fecha_hora, tipo_actividad, descripcion, observaciones_especiales) VALUES
(4, 6, '2026-08-10 08:30', 'alimentacion', 'Desayuno con ración indicada por el dueño.', NULL),
(4, 6, '2026-08-10 12:00', 'paseo', 'Paseo de 20 minutos en el patio.', NULL),
(5, 7, '2026-08-12 09:00', 'alimentacion', 'Alimentación especial para ave.', 'Requiere semillas específicas, ver ficha.');

-- 5.9 Incidentes
INSERT INTO incidente (id_mascota, id_usuario, fecha_hora, tipo, gravedad, descripcion, evidencia_foto) VALUES
(4, 6, '2026-08-10 15:00', 'comportamiento', 'baja', 'Toby mostró ansiedad al separarse del dueño, se calmó luego de 10 minutos.', NULL);

-- 5.10 Estancias (originadas por el servicio de cuidado)
INSERT INTO estancia (id_mascota, id_servicio, fecha_entrada, fecha_salida, observaciones) VALUES
(4, 3, '2026-08-10 07:00', '2026-08-10 18:30', 'Estancia sin novedades relevantes, salvo incidente menor reportado.'),
(5, 5, '2026-08-12 07:00', NULL, 'Mascota aún hospedada.');

-- 5.11 Auditoría
INSERT INTO auditoria (id_usuario, accion, entidad_afectada, detalle, ip_origen) VALUES
(1, 'Registró mascota', 'MASCOTA', 'Creó el registro de Rocky.', '190.10.20.30'),
(8, 'Creó servicio', 'SERVICIO', 'Agendó cita veterinaria para Luna (id_servicio=2).', '190.10.20.45'),
(9, 'Consultó auditoría', 'AUDITORIA', 'Revisión mensual de logs.', '190.10.20.99');

-- ============================================================================
-- 6. CONSULTAS SQL DE VALIDACIÓN
-- ============================================================================

-- 6.1 SELECT simple con filtro: mascotas de un dueño específico
-- Valida: filtrado básico y correcta relación mascota -> usuario.
SELECT m.id_mascota, m.nombre, m.especie, m.raza
FROM mascota m
WHERE m.id_usuario = 1;

-- 6.2 INNER JOIN: listar servicios con nombre de mascota y del proveedor
-- Valida: integridad referencial servicio -> mascota / usuario (proveedor).
SELECT s.id_servicio, m.nombre AS mascota, u.primer_nombre || ' ' || u.apellido AS proveedor,
       s.tipo_servicio, s.estado, s.costo
FROM servicio s
INNER JOIN mascota m ON m.id_mascota = s.id_mascota
INNER JOIN usuario u ON u.id_usuario = s.id_usuario_proveedor
ORDER BY s.fecha;

-- 6.3 LEFT JOIN: todos los servicios y su calificación (si existe)
-- Valida: relación opcional 1:0..1 entre servicio y calificacion.
SELECT s.id_servicio, s.tipo_servicio, s.estado, c.puntuacion, c.comentario
FROM servicio s
LEFT JOIN calificacion c ON c.id_servicio = s.id_servicio
ORDER BY s.id_servicio;

-- 6.4 GROUP BY + función de agregación: promedio de calificación por veterinario/cuidador
-- Valida: cálculo de indicadores por proveedor, usado en US-14 (gestión) y reputación de proveedores.
SELECT u.id_usuario, u.primer_nombre, u.apellido, u.tipo_usuario,
       ROUND(AVG(c.puntuacion), 2) AS promedio_calificacion,
       COUNT(c.id_calificacion) AS total_calificaciones
FROM usuario u
JOIN servicio s ON s.id_usuario_proveedor = u.id_usuario
JOIN calificacion c ON c.id_servicio = s.id_servicio
GROUP BY u.id_usuario, u.primer_nombre, u.apellido, u.tipo_usuario
ORDER BY promedio_calificacion DESC;

-- 6.5 Filtro + ORDER BY: notificaciones no leídas de un usuario, más recientes primero
-- Valida: US relacionada con notificaciones y su estado de lectura.
SELECT id_notificacion, mensaje, tipo, canal_envio, fecha_envio
FROM notificacion
WHERE id_usuario = 1 AND leida = false
ORDER BY fecha_envio DESC;

-- 6.6 JOIN múltiple: mascotas actualmente en guardería (estancia activa)
-- Valida: US-16 "Consultar Mascotas en Turno" (fecha_salida IS NULL = sigue hospedada).
SELECT e.id_estancia, m.nombre AS mascota, u.primer_nombre || ' ' || u.apellido AS dueno,
       e.fecha_entrada
FROM estancia e
JOIN mascota m ON m.id_mascota = e.id_mascota
JOIN usuario u ON u.id_usuario = m.id_usuario
WHERE e.fecha_salida IS NULL;

-- 6.7 GROUP BY: cantidad de incidentes por nivel de gravedad
-- Valida: US-19 "Reportar Incidencias" / soporte a tablero de administrador.
SELECT gravedad, COUNT(*) AS total
FROM incidente
GROUP BY gravedad
ORDER BY total DESC;

-- 6.8 Consulta clínica: historial completo de diagnósticos de una mascota
-- Valida: US-12 "Consultar Historial Clínico".
SELECT d.fecha, d.diagnostico, d.tratamiento, u.primer_nombre || ' ' || u.apellido AS veterinario
FROM diagnostico d
JOIN usuario u ON u.id_usuario = d.id_usuario
WHERE d.id_mascota = 1
ORDER BY d.fecha DESC;

-- 6.9 Disponibilidad libre de un proveedor en una fecha (para agendar)
-- Valida: US-07/US-08, evita ofrecer bloques ya tomados (regla de negocio #7).
SELECT id_disponibilidad, fecha, hora_inicio, hora_fin
FROM disponibilidad
WHERE id_usuario = 4 AND fecha = '2026-08-10' AND disponible = true
ORDER BY hora_inicio;

-- 6.10 Auditoría por usuario y rango de fechas
-- Valida: US-15 "Auditoría de Logs".
SELECT a.fecha_hora, u.primer_nombre, u.apellido, a.accion, a.entidad_afectada
FROM auditoria a
JOIN usuario u ON u.id_usuario = a.id_usuario
WHERE a.fecha_hora >= '2026-08-01'
ORDER BY a.fecha_hora DESC;

-- 6.11 Conteo de servicios por tipo y estado (tablero administrativo)
-- Valida: agregación multi-columna típica de dashboards (RF014).
SELECT tipo_servicio, estado, COUNT(*) AS cantidad, SUM(costo) AS costo_total
FROM servicio
GROUP BY tipo_servicio, estado
ORDER BY tipo_servicio, estado;

-- 6.12 Verificación de integridad de rol (debe fallar por regla de negocio #5)
-- Valida que el trigger de rol efectivamente bloquea datos inconsistentes.
-- Descomentar para probar (se espera un error controlado):
-- INSERT INTO servicio (id_mascota, id_usuario_solicitante, id_usuario_proveedor, id_usuario_registrador, fecha, tipo_servicio, costo)
-- VALUES (1, 1, 1, 1, now(), 'veterinario', 50000); -- id_usuario_proveedor=1 tiene rol 'dueno', debe fallar.

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
