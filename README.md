# SMT Catering — Plataforma B2B

Plataforma de cotización en tiempo real, gestión de eventos y comandas de cocina para eventos corporativos (50 a 120 comensales).

---

## 🚀 Inicio Rápido (Cómo levantar el proyecto)

### 1. Variables de Entorno

Asegurarse de tener el archivo `.env` configurado en la raíz con la conexión a **Neon PostgreSQL**:

```env
DATABASE_URL=postgresql://usuario:password@ep-ejemplo.aws.neon.tech/neondb?sslmode=require
PORT=3001
COOKIE_SECRET=smt-catering-super-secret-key-2026
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Inicializar / Migrar la Base de Datos en Neon

Aplica el esquema DDL (`server/db/schema.sql`) y siembra los datos iniciales de prueba (`server/db/seed.sql`) en Neon Cloud:

```bash
npm run db:setup
```

### 4. Levantar la aplicación en desarrollo local

Abrir **dos terminales**:

- **Terminal 1:** Levanta el Backend (API) en el puerto `3001`

  ```bash
  npm run server
  ```

- **Terminal 2:** Levanta el Frontend (Web) en el puerto `5173`
  ```bash
  npm run dev
  ```

Abrir en el navegador: **http://localhost:5173**

---

## 👥 Usuarios de Prueba para Iniciar Sesión

| Rol             | Usuario / Email                     | Contraseña | ¿Qué puede ver?                                              |
| --------------- | ----------------------------------- | ---------- | ------------------------------------------------------------ |
| **Admin**       | `admin` (o `admin@smtcatering.com`) | `admin123` | Dashboard, cotizador, edición de eventos, tarifas y usuarios |
| **Superadmin**  | `superadmin@smtcatering.com`        | `admin123` | Control total, eliminaciones permanentes y gestión de staff  |
| **Cocina**      | `cocina@smtcatering.com`            | `admin123` | Calendario de eventos y comandas de producción (sin precios) |
| **Cliente B2B** | `eventos@aluar.com.ar`              | `admin123` | Cotizador interactivo, solicitudes y perfil de empresa       |

---

## Datos de prueba para pasarela de pagos

Lo que es pasarela de pagos queda con tokens y datos no productivos para que se pueda probar el flujo. Una vez finalizado el ciclo de pruebas se debe modificar por credenciales productivas para el uso correcto.

Se recomienda ingresar desde un navegador que no tenga una cuenta ya abierta de mercado pago, en su defecto cerrar la que tiene abierta e ingresar con estos datos:

- USUARIO: `TESTUSER7767924943051789399`
- CLAVE: `yMX7ISU0qP`
- Si necesitara codigo de verificación: `648665`

Datos de tarjeta para realizar pruebas:

- Nro tarjeta: `5031 7557 3453 0604`
- Clave: `123`
- Fecha de vto: `11/30`
- Nombre del titular: `APRO`
- DNI: `12345678`

IMPORTANTE: La pasarela solo funcionará correctamente con redirecciones en el ambiente desplegado, no así en local por cuestiones de seguridad.

---

## 🛠️ Comandos útiles

```bash
npm run db:setup   # Aplica DDL y datos de prueba (seed) en Neon PostgreSQL
npm run server     # Inicia el servidor backend (http://localhost:3001)
npm run dev        # Inicia el frontend Vite (http://localhost:5173)
npm run build      # Compila TypeScript y construye el bundle de producción
npm run lint       # Revisa el código con oxlint (0 errores garantizados)
npm run typecheck  # Verifica tipos con TypeScript (tsc -b)
npm run smoke      # Ejecuta prueba de renderizado de vistas
```

Antes de subir cambios a Git, asegurate de correr:

```bash
npm run lint && npm run typecheck
```

---

## 📁 Estructura básica del proyecto

```
smt-catering/
├── src/                # Frontend (React 19, Tailwind CSS 4, React Router 7)
│   ├── components/     # Componentes visuales reutilizables (Botones, Modales, Tablas)
│   ├── features/       # Pantallas por módulo (cotizador, eventos, comandas, tarifas, usuarios)
│   └── stores/         # Estado global de sesión y autenticación (Zustand)
├── server/             # Backend (Node.js nativo + pg)
│   ├── db/             # Base de datos Neon PostgreSQL (schema.sql, seed.sql, client.ts)
│   └── lib/            # Utilidades de seguridad (JWT criptográfico, hash scrypt)
├── shared/             # Contratos compartidos entre front y back (tipos TS y esquemas Zod)
└── docs/               # Documentación interna (ISSUES.md y diagrama MER_v3.xml)
```
