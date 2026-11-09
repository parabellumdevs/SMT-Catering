-- =====================================================================
-- SMT Catering — Esquema de Base de Datos PostgreSQL (MER_v3.xml)
-- Compatible con Neon Cloud Database
-- =====================================================================

-- 1. CLIENTE (EMPRESA B2B)
CREATE TABLE IF NOT EXISTS cliente (
  id_cliente SERIAL PRIMARY KEY,
  razon_social VARCHAR(80) NOT NULL,
  cuit VARCHAR(15) UNIQUE NOT NULL,
  nombre_completo VARCHAR(50) NOT NULL,
  cargo_responsable VARCHAR(50),
  email VARCHAR(100) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  direccion_legal VARCHAR(100),
  fecha_aniversario DATE,
  password_hash VARCHAR(255) NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. USUARIO (STAFF INTERNO: admin, cocina, superadmin)
CREATE TABLE IF NOT EXISTS usuario_staff (
  id_usuario SERIAL PRIMARY KEY,
  nombre_completo VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK(rol IN ('superadmin', 'admin', 'cocina')),
  activo INTEGER NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. ESTACION / ISLA GASTRONOMICA
CREATE TABLE IF NOT EXISTS estacion (
  id_estacion SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  tipo_comida VARCHAR(20) NOT NULL DEFAULT 'salado', -- salado / dulce
  descripcion VARCHAR(150),
  precio_por_persona DECIMAL(10,2) NOT NULL
);

-- 4. RESERVA DE EVENTO
CREATE TABLE IF NOT EXISTS reserva (
  id_reserva SERIAL PRIMARY KEY,
  id_cliente INTEGER NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
  fecha_evento DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  duracion_horas REAL NOT NULL CHECK(duracion_horas <= 3.0),
  cantidad_invitados INTEGER NOT NULL CHECK(cantidad_invitados >= 50 AND cantidad_invitados <= 120),
  direccion_evento VARCHAR(150) NOT NULL,
  distancia_km DECIMAL(4,2) CHECK(distancia_km <= 20.0),
  evento_cancelado INTEGER NOT NULL DEFAULT 0,
  estado_evento VARCHAR(30) NOT NULL DEFAULT 'Presupuestado',
  estado_pago VARCHAR(30) NOT NULL DEFAULT 'SALDO_PENDIENTE',
  notas_cocina TEXT DEFAULT '',
  monto_total DECIMAL(10,2) NOT NULL,
  monto_seguro DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ,
  actualizado_por VARCHAR(50)
);

-- 5. DETALLE DE ESTACIONES POR RESERVA (Junction table)
CREATE TABLE IF NOT EXISTS detalle_reserva_estacion (
  id_reserva INTEGER NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
  id_estacion INTEGER NOT NULL REFERENCES estacion(id_estacion),
  subtotal_calculado DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id_reserva, id_estacion)
);

-- 6. RESTRICCIONES ALIMENTARIAS (Normalizada 1 a N)
CREATE TABLE IF NOT EXISTS restriccion_alimentaria (
  id_restriccion SERIAL PRIMARY KEY,
  id_reserva INTEGER NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
  tipo_restriccion VARCHAR(50) NOT NULL,
  cantidad_personas INTEGER NOT NULL DEFAULT 1,
  observaciones VARCHAR(100)
);

-- 7. PAGOS Y LIQUIDACIONES
CREATE TABLE IF NOT EXISTS pago (
  id_pago SERIAL PRIMARY KEY,
  id_reserva INTEGER NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
  tipo_pago VARCHAR(25) NOT NULL CHECK(tipo_pago IN ('SEÑA', 'SALDO', 'TOTAL')),
  monto DECIMAL(10,2) NOT NULL,
  pago_online INTEGER NOT NULL DEFAULT 1,
  pago_completo INTEGER NOT NULL DEFAULT 0,
  fecha_pago TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(20) NOT NULL CHECK(estado IN ('pendiente', 'confirmado', 'cancelado')),
  mercado_pago_payment_id TEXT UNIQUE
);

-- Preferencias y pagos de Mercado Pago Checkout Pro
CREATE TABLE IF NOT EXISTS mercado_pago_checkout (
  external_reference TEXT PRIMARY KEY,
  preference_id TEXT,
  reservation_data JSONB NOT NULL,
  expected_amount_cents INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_id TEXT UNIQUE,
  event_id TEXT,
  payment_kind VARCHAR(20) NOT NULL DEFAULT 'reservation',
  client_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. COMANDAS DE PRODUCCION
CREATE TABLE IF NOT EXISTS comanda_produccion (
  id_comanda SERIAL PRIMARY KEY,
  id_reserva INTEGER NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
  id_estacion INTEGER NOT NULL REFERENCES estacion(id_estacion),
  observaciones TEXT,
  fecha_emision TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ,
  actualizado_por VARCHAR(50)
);

-- 9. TARIFAS BASE Y SEGURO (Configuración general del cotizador)
CREATE TABLE IF NOT EXISTS tarifas (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK(category IN ('base', 'station', 'extra', 'insurance')),
  price_per_guest_cents INTEGER NOT NULL DEFAULT 0,
  fixed_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- 10. TOKENS DE RECUPERACIÓN DE CONTRASEÑA
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
