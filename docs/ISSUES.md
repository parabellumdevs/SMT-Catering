# Backlog de Tareas e Issues — SMT Catering

Documento maestro de seguimiento de tareas completadas (incluyendo los hitos de la primera etapa de implementación y su evolución a cloud) y tareas pendientes, contrastado contra el relevamiento completo de reuniones con el cliente (Meets 1 a 5), especificaciones operativas y el estado actual de la rama `develop`.

---

## 1. Backend, Infraestructura & Base de Datos

### 1.1 Fase 1 — Primera Implementación y Validación Local (Hitos Completados)

_(Etapa fundacional del proyecto utilizada para validar el modelo de dominio, contratos y flujos iniciales antes de la migración a infraestructura Cloud)_

- [x] **Base de Datos Inicial Local con SQLite (`node:sqlite`)**
  - [x] Configurar base de datos relacional local (`server/db/smt.sqlite`) sin dependencias binarias externas utilizando `node:sqlite` nativo.
  - [x] Implementar script de reinicio instantáneo `npm run db:reset` (`server/db/reset.mjs`) para sincronizar el entorno local del equipo sin conflictos de migraciones.
  - [x] Configurar exclusión en [`.gitignore`](../.gitignore) para no subir archivos binarios `.sqlite`, `.db` ni variables `.env` al repositorio.
- [x] **Panel Inicial de Administración con AdminJS (`/admin`)**
  - [x] Integración exploratoria de panel administrativo genérico para alta temprana de usuarios staff (posteriormente evolucionado a la vista nativa integrada `/usuarios` con redirección automática `302` desde `/admin`).
- [x] **Desacoplamiento Progresivo de Mocks (`mock-data.ts`)**
  - [x] Garantizar paridad total de datos entre el seed de base de datos y las pantallas del frontend (mismos clientes B2B, fechas dinámicas relativas al día actual, tarifas, estaciones y notas).
  - [x] Mover funciones utilitarias de fecha (`daysUntil`, `isWithinProductionWindow`) de `mock-data.ts` a [`src/lib/utils.ts`](../src/lib/utils.ts).
  - [x] Desacoplar y eliminar definitivamente `src/lib/mock-data.ts`, inicializando los stores en vacío (`[]`) con consumo obligatorio desde el backend.
- [x] **Primera Iteración de Módulos Backend (`server/modules/`)**
  - [x] Crear capa de contratos compartidos ([`shared/types/`](../shared/types)) y esquemas de validación Zod ([`shared/schemas/`](../shared/schemas)).
  - [x] Estructurar el boceto inicial de módulos verticales en [`server/modules/`](../server/modules) (`auth`, `events`, `quotation`, `production`, `tariffs`) y middlewares ([`authGuard.ts`](../server/middleware/authGuard.ts), [`roleGuard.ts`](../server/middleware/roleGuard.ts)).

### 1.2 Fase 2 — Evolución a Cloud (Neon PostgreSQL), Seguridad Real & Monolito Serverless (Estado Actual)

- [x] **Modelado de Base de Datos en Español (según `docs/MER_v3.xml`) y Migración a Neon Cloud**
  - [x] Contrastar y ajustar la estructura de tablas, restricciones `CHECK` y relaciones en [`server/db/schema.sql`](../server/db/schema.sql) según el modelo definido en [`docs/MER_v3.xml`](MER_v3.xml): `cliente`, `usuario_staff`, `estacion`, `reserva`, `detalle_reserva_estacion`, `restriccion_alimentaria`, `pago`, `comanda_produccion`, `tarifas` y `password_reset_tokens`.
  - [x] Diseñar script de datos de prueba ([`server/db/seed.sql`](../server/db/seed.sql)) con casos realistas en PostgreSQL: eventos pasados saldados, eventos futuros señados, eventos concurrentes de $\le 60$ comensales, seguro contra todo riesgo (`$80.000`), variedad de restricciones alimentarias normalizadas y estados de pago.
  - [x] Migración y conexión activa con **Neon PostgreSQL Cloud** ([`server/db/client.ts`](../server/db/client.ts), [`server/db/migrate-neon.mjs`](../server/db/migrate-neon.mjs) y scripts `npm run db:setup` / `npm run db:migrate:neon`).
  - [x] Configuración de despliegue serverless para Vercel ([`vercel.json`](../vercel.json), [`server/vercel.ts`](../server/vercel.ts) y empaquetado con `esbuild` hacia [`api/index.js`](../api/index.js)).
- [x] **Autenticación, Sesiones & Arquitectura de Seguridad**
  - [x] Implementar firma y verificación real de JWT (`HMAC-SHA256`) en [`server/lib/jwt.ts`](../server/lib/jwt.ts) almacenado en cookie HTTP-only (`smt_session`, `SameSite=Lax`).
  - [x] Implementar hashing seguro de contraseñas con `scrypt` criptográfico nativo ([`server/lib/passwords.ts`](../server/lib/passwords.ts)).
  - [x] Endpoint `GET /api/auth/me` para devolver la información del usuario autenticado (`id`, `username`, `fullName`, `email`, `role`).
  - > **Principio de Seguridad vs UX:**
  - > - **Seguridad Real (Backend):** La seguridad reside en el backend validando la cookie JWT en cada petición protegida y rechazando accesos no autorizados con `401`/`403`.
  - > - **Renderizado UI (Frontend):** Al cargar la aplicación, el frontend consulta `GET /api/auth/me` y guarda la sesión en `useAuthStore` únicamente para propósitos visuales (ocultar botones que el rol no puede ejecutar, adaptar la navegación en `AppShell` y mostrar saludo personalizado).
- [x] **Sistema de Roles y Permisos (RBAC)**
  - [x] Definir los 4 roles del sistema en contratos compartidos ([`shared/types/roles.ts`](../shared/types/roles.ts)): `superadmin`, `admin`, `cocina` y `cliente`.
  - [x] Integrar guards en frontend ([`src/App.tsx`](../src/App.tsx)) para restringir rutas según rol autenticado (`ProtectedRoute` y `AdminRoute`).
- [x] **Proxy de Desarrollo & Cliente HTTP Unificado**
  - [x] Configurar proxy de Vite en [`vite.config.ts`](../vite.config.ts) (`/api` -> `http://localhost:3001`) para evitar errores de CORS y habilitar transporte transparente de cookies en desarrollo y producción.
  - [x] Crear cliente HTTP centralizado ([`src/lib/api.ts`](../src/lib/api.ts)) para unificar llamadas del frontend a endpoints relativos (`/api/...`).
- [x] **Gestión Centralizada de Usuarios en la App (`/usuarios`)**
  - [x] Reemplazar el panel genérico externo por la sección nativa integrada en la app ([`src/features/users/UsersPage.tsx`](../src/features/users/UsersPage.tsx)).
  - [x] Endpoints protegidos en backend (`GET /api/users`, `POST /api/users/staff`, `PATCH /api/users/staff/:id`, `DELETE /api/users/staff/:id`, `PATCH /api/users/clients/:id`).
  - [x] Pestañas de directorio: Equipo Interno (Staff) y Clientes Corporativos B2B.
  - [x] Modales de alta de colaborador con hashing de contraseñas, edición de roles, toggle de estado activo/inactivo y blanqueo de clave.
- [x] **Unificación de Contratos y Modelos en Español (según `MER_v3`)**
  - [x] Migrar interfaces, DTOs y tipos compartidos ([`shared/types/modelos.ts`](../shared/types/modelos.ts)) a español (`Cliente`, `UsuarioStaff`, `Reserva`, `Estacion`, `DetalleReservaEstacion`, `RestriccionAlimentaria`, `Pago`, `ComandaProduccion`, `Tarifa`).
  - [x] Adaptar modelos del frontend ([`src/types/domain.ts`](../src/types/domain.ts)) y stores (`eventStore`, `tariffStore`, `authStore`) para consumir los endpoints reales.
- [x] **Consolidación de Arquitectura Modular en Backend (Punto F)**
  - [x] Refactorizar y conectar [`server/modules/`](../server/modules) (`auth`, `events`, `quotation`, `production`, `tariffs`, `users`, `profile`) para que utilicen el cliente asíncrono de **PostgreSQL (Neon)** y las tablas en español del `MER_v3`, eliminando el monolito de [`server/index.ts`](../server/index.ts) y las llamadas obsoletas a `db.prepare()` de la Fase 1.

---

## 2. Global, UI & Sistema de Diseño

- [x] **Estandarización de Estilos & Librerías**
  - [x] Confirmado Tailwind CSS 4 + Radix UI como base oficial de estilos (descartado Bootstrap para evitar conflictos de especificidad y sobrecarga en el bundle).
  - [ ] Garantizar consistencia visual de componentes (botones pill, modales, formularios, tablas) en todas las vistas según el diseño oficial.
- [ ] **Actualización de Paleta de Colores (Identidad Bordó / Borravino)**
  - [x] Incorporar tokens de color institucional Bordó (`--color-brand: #3D101A`, `--color-brand-dark: #2A0A11`, `--color-brand-light: #5C1A27`) en `@theme` de [`src/index.css`](../src/index.css) y aplicarlos en Login, Sidebar (`AppShell`), Comandas y Tarifas.
  - [ ] Completar la migración de acentos en las vistas restantes (`QuotationPage`, `DashboardPage`, `UsersPage`, `ProfilePage`) reemplazando los usos residuales del violeta (`--color-primary: #533afd`) por la paleta Bordó.
- [ ] **Controles de Formulario**
  - [ ] Ocultar flechas por defecto (`spinners` / `steppers`) en todos los inputs de tipo numérico (`input[type=number]`).
- [x] **Navegación Dinámica por Rol**
  - [x] Configurar [`AppShell.tsx`](../src/components/layout/AppShell.tsx) y [`nav-items.ts`](../src/components/layout/nav-items.ts) para renderizar únicamente las secciones habilitadas según el rol del usuario conectado.
- [x] **Manejador Global y Modular de Errores (Error Boundary)**
  - [x] Incorporar librería `react-error-boundary` y crear componente [`src/components/ui/ErrorBoundary.tsx`](../src/components/ui/ErrorBoundary.tsx).
  - [x] Diseñar vista de contingencia (`ErrorFallback`) con identidad de marca Bordó (`bg-brand`), mensaje claro para el usuario, detalle técnico colapsable y acciones rápidas ("Reintentar", "Recargar página" e "Ir al inicio").
  - [x] Envolver la raíz de la aplicación en [`src/App.tsx`](../src/App.tsx) para prevenir pantallas en blanco fatales.
  - [x] Envolver el área de contenido (`<Outlet />`) en [`src/components/layout/AppShell.tsx`](../src/components/layout/AppShell.tsx) con `resetKeys={[location.pathname]}` para aislar fallos de renderizado por módulo manteniendo la barra lateral y navegación intactas.

---

## 3. Login & Autenticación

- [x] **Recuperación de Contraseña**
  - [x] Agregar enlace `"¿Olvidaste tu contraseña?"` en el formulario de login ([`LoginPage.tsx`](../src/features/login/LoginPage.tsx)).
  - [x] Desarrollar vista ([`ForgotPasswordModal.tsx`](../src/features/login/ForgotPasswordModal.tsx)) y endpoints (`POST /api/auth/forgot-password` y `POST /api/auth/reset-password`) para solicitud de restablecimiento y cambio de contraseña con token temporal.
- [x] **Registro de Nuevos Usuarios (`cliente` B2B)**
  - [x] Definir esquema de validación Zod ([`shared/schemas/auth.schema.ts`](../shared/schemas/auth.schema.ts)) y endpoint backend (`POST /api/auth/register`).
  - [x] Implementar vista de registro integrada en [`src/features/login/RegisterForm.tsx`](../src/features/login/RegisterForm.tsx) (evolucionada desde el `RegisterModal` inicial) con asignación automática del rol `cliente`.
  - [x] Agregar campos del `MER_v3` y RF-01 en el formulario de registro B2B: **Fecha de aniversario/fundación de la empresa (`fecha_aniversario`)** y **Dirección legal (`direccion_legal`)**.
- [x] **Acceso Total de Superadmin**
  - [x] Permitir al `superadmin` acceder a toda la plataforma con permisos integrales, gestión de usuarios en `/usuarios` y navegación completa.

---

## 4. Perfil & Configuración Personal [Cliente]

- [x] **Acceso a Configuración**
  - [x] Incorporar ícono de engranaje (ruedita) en la barra de navegación para el rol `cliente`.
- [x] **Gestión de Datos Personales y de Empresa**
  - [x] Pantalla [`ProfilePage.tsx`](../src/features/profile/ProfilePage.tsx) para visualización y actualización de información de contacto (razón social, CUIT de solo lectura, nombre del responsable, cargo, email, teléfono y dirección legal).
  - [x] Incorporar visualización y edición del campo **Fecha de aniversario de la empresa (`fecha_aniversario`)** en [`ProfilePage.tsx`](../src/features/profile/ProfilePage.tsx).
- [x] **Cambio de Contraseña**
  - [x] Formulario de actualización de contraseña con validación de contraseña actual y nueva contraseña (`POST /api/client/change-password`).

---

## 5. Cotizador en Tiempo Real [Cliente]

- [x] **Validación de Ubicación y Radio de Cobertura (20 km)**
  - [x] Definir regla de distancia máxima $\le 20\text{ km}$ en esquema Zod ([`shared/schemas/quotation.schema.ts`](../shared/schemas/quotation.schema.ts)) y columna `distancia_km` en base de datos.
  - [x] Campo en frontend ([`QuotationPage.tsx`](../src/features/quotation/QuotationPage.tsx)) para ingresar dirección del evento ([`LocationField.tsx`](../src/features/quotation/components/LocationField.tsx)).
  - [x] Validación de distancia dentro del radio operativo de **20 km a la redonda** desde el punto base establecido (**Monserrat, Venezuela 1478, CABA**) con cálculo Haversine y autocompletado OSM ([`shared/geo.ts`](../shared/geo.ts), [`src/lib/geocoding.ts`](../src/lib/geocoding.ts)).
- [ ] **Selector de Islas / Estaciones y Menú Oficial**
  - [ ] Actualizar en [`src/lib/constants.ts`](../src/lib/constants.ts) y [`server/db/seed.sql`](../server/db/seed.sql) las descripciones de las **5 estaciones gastronómicas** según el menú oficial del cliente:
    1. **Estación Entradas:** Tabla de quesos (Parmesano, Gouda, Roquefort), Tabla de fiambres (Jamón crudo, Jamón cocido, Salame de colonia) y Brochettes (Caprese y mixtos de pollo/vegetales).
    2. **Estación Pastas:** Ñoquis de papa y Sorrentinos de jamón y queso, con dos opciones de salsa (Fileto clásica y Salsa Parisienne).
    3. **Estación Parrilla:** Asado banderita de ternera, Mini chorizos bombón, Pollo asado, aderezos y carbón/leña proporcional por comensal.
    4. **Estación Asiática:** Wok de verduras de estación (sola y opción con pollo) y Sushi rolls variados (Salmon Roll, Veggie Roll y Philadelphia).
    5. **Estación Dulce:** 5 variedades de shots de postres (Chocotorta, Lemon Pie, Cheesecake de frutos rojos, Mousse de chocolate y Oreotorta).
  - [ ] Incorporar imágenes ilustrativas de alta calidad para cada una de las estaciones gastronómicas en [`StationSelector.tsx`](../src/features/quotation/components/StationSelector.tsx).
- [x] **Adicionales**
  - [x] Eliminar la opción "Mantelería" y "Cubiertos" de los ítems adicionales disponibles, dejando únicamente **Barra de tragos (Barra libre)** opcional por comensal.
- [ ] **Restricciones Alimentarias**
  - [x] Tipado de modelo para `"Otros"` con detalle y cantidad ([`shared/types/events.ts`](../shared/types/events.ts)).
  - [ ] Revisar y agregar restricciones faltantes en [`DietaryMatrix.tsx`](../src/features/quotation/components/DietaryMatrix.tsx): agregar **"Sin sal (Hipertensión)"** y permitir agregar restricciones personalizadas (**"Otros"**) indicando descripción y cantidad exacta de comensales.
  - [ ] Persistir y recuperar en el backend todas las categorías de restricciones alimentarias, validando que la suma no supere el total de invitados.
- [ ] **Fecha del Evento, Horarios & Disponibilidad**
  - [x] Definir reglas de validación en esquema Zod ([`shared/schemas/quotation.schema.ts`](../shared/schemas/quotation.schema.ts)) y servicio de cotización.
  - [x] Restringir la selección de fechas en el calendario exclusivamente a días **viernes, sábados y domingos** ([`AvailabilityCalendar.tsx`](../src/features/quotation/components/AvailabilityCalendar.tsx)).
  - [x] Unificar la antelación mínima de reserva (**14 / 15 días**) entre [`src/lib/constants.ts`](../src/lib/constants.ts) y [`shared/schemas/quotation.schema.ts`](../shared/schemas/quotation.schema.ts).
  - [ ] **Franja horaria y duración del servicio:**
    - [ ] Duración máxima del evento: **hasta 3 horas**.
    - [ ] El cliente debe seleccionar su horario dentro de la ventana operativa nocturna de **19:00 a 00:00 hs** (horario límite de finalización: 00:00 hs).
  - [ ] **Regla de eventos concurrentes en una misma fecha (Optimización de turnos):**
    - [x] Lógica conceptual bocetada en [`QuotationService.checkAvailability`](../server/modules/quotation/quotation.service.ts).
    - [ ] Conectar la validación en el backend PostgreSQL y reflejarla en [`AvailabilityCalendar.tsx`](../src/features/quotation/components/AvailabilityCalendar.tsx): si una fecha posee 1 reserva con $\le 60$ comensales, habilitarla para un **2.º evento de máximo 60 comensales**.
- [ ] **Resumen Financiero & Checkout**
  - [x] Incorporar tarifa fija de **Seguro contra todo riesgo (`$80.000`)** en base de datos y cálculo de cotización.
  - [x] Ajustar seña al **50%** en cálculo de cotización (congela el precio y aprueba automáticamente para producción).
  - [X] Permitir al cliente elegir el monto inicial a abonar en frontend: **50% (Seña)** o **100% (Total)**.
  - [X] Renombrar el botón `"Confirmar evento"` por **`"Pagar"`** en [`PriceSummary.tsx`](../src/features/quotation/components/PriceSummary.tsx).
  - [X] Quitar el botón `"Compartir resumen"` en [`PriceSummary.tsx`](../src/features/quotation/components/PriceSummary.tsx).
  - [x] Implementar modal informativo previo a la redirección a la pasarela de pagos en [`ConfirmEventModal.tsx`](../src/features/quotation/components/ConfirmEventModal.tsx), tomando automáticamente los datos del cliente B2B autenticado.

---

## 6. Mis Eventos [Cliente]

- [ ] **Listado de Eventos Propios**
  - [x] Crear scaffold de la vista [`src/features/my-events/MyEventsPage.tsx`](../src/features/my-events/MyEventsPage.tsx).
  - [x] Boceto de controlador en [`EventsController.myEvents`](../server/modules/events/events.controller.ts).
  - [ ] Registrar la ruta `/mis-eventos` en [`src/App.tsx`](../src/App.tsx), agregar enlace en [`nav-items.ts`](../src/components/layout/nav-items.ts) para el rol `cliente` y conectar el endpoint real `GET /api/events/my-events` contra PostgreSQL.
  - [ ] Mostrar tarjetas/grilla con: fecha y horario contratado, dirección, comensales, estaciones seleccionadas y estado de cobro.
- [ ] **Acciones Disponibles por Evento**
  - [X] **Ver Detalle:** modal o vista con el desglose completo de la cotización y servicios.
  - [ ] **Pagar Saldo Restante (50%):** botón para abonar el saldo pendiente (vencimiento: hasta **24 horas antes** del evento) con redirección a pasarela de pagos y actualización a `SALDADO`.
  - [X] **Comprobantes (PDF):** descarga o previsualización del comprobante comercial / factura de los pagos efectuados.
  - [ ] **Reprogramación:** solicitar cambio de fecha sin recargo, validando únicamente que la nueva fecha cumpla con las reglas de disponibilidad y concurrencia ($\le 60$ pax).
  - [X] **Cancelación:** botón para solicitar cancelación del evento aplicando la política acordada:
    - Hasta **7 días (1 semana) antes** del evento: **reintegro del 100% de la seña**.
    - Menos de **7 días antes** del evento: **sin reintegro de la seña**.

---

## 7. Eventos & Calendario [Admin & Cocina]

- [ ] **Migración a DataTable & Paginación**
  - [ ] Implementar tabla avanzada en [`EventTable.tsx`](../src/features/dashboard/components/EventTable.tsx) con paginación de hasta **15 registros por página**.
  - [ ] Columnas con flechas interactivas para ordenamiento ascendente y descendente (`sortable`).
- [ ] **Filtros & Búsqueda**
  - [ ] Filtro por rango de fechas (con soporte para consultar **eventos históricos/pasados**, que operan como el 3.er comprobante de registro interno de SMT Catering).
  - [ ] Buscador en tiempo real por nombre de cliente / empresa.
  - [ ] Filtro por estado del evento / estado de cobro.
  - [ ] Quitar el filtro rápido `"En riesgo logístico"` en [`DashboardPage.tsx`](../src/features/dashboard/DashboardPage.tsx).
- [ ] **Ajuste de Columnas (según Figma)**
  - [ ] Modificar la columna `"Total"`: exhibir el importe total y, debajo en tipografía secundaria, el **saldo pendiente** (eliminar mención de seña en esa celda).
- [ ] **Acciones de Administración (`admin` y `superadmin`)**
  - [ ] Botón para ver detalle completo y editar parámetros del evento.
  - [ ] Botón para cambio/reprogramación manual de fecha validando disponibilidad.
  - [ ] **Registro de pago manual/presencial** cuando el cliente abona en el local (actualizando el estado a `SALDADO` e insertando el registro en `pago` sin redireccionar a pasarela externa).
  - [ ] Botón para cancelación de evento con cálculo de reintegro según la regla de 7 días y baja de comanda en cocina.
- [ ] **Separación de Vistas**
  - [ ] Mover las tarjetas de métricas (`KpiGrid`) fuera de [`DashboardPage.tsx`](../src/features/dashboard/components/KpiGrid.tsx) hacia la vista independiente de **"Métricas"** (`/metricas`).
- [ ] **Restricciones de Acceso para Rol Cocina (`cocina`)**
  - [x] Sanitización bocetada en [`EventsController.list`](../server/modules/events/events.controller.ts).
  - [ ] Aplicar la sanitización en el endpoint activo `GET /api/events` y ocultar en la UI de [`EventTable.tsx`](../src/features/dashboard/components/EventTable.tsx) las columnas de importes, saldos y botones de cobro/edición para el rol `cocina`.
  - [x] Al hacer clic en un evento desde la vista de eventos, navegar directamente al detalle de su comanda (`/comandas/:eventId`).

---

## 8. Gestión de Tarifas [Admin]

- [x] **Ajuste de Catálogo de Tarifas**
  - [x] Cargar en base de datos ([`server/db/seed.sql`](../server/db/seed.sql)) la tarifa de `"Seguro contra todo riesgo"` (`$80.000`) y excluir cubiertos y mantelería.
  - [x] Eliminar de la UI de tarifas los ítems `"Cubiertos"` y `"Mantelería"`.
  - [x] Visualizar y editar la tarifa correspondiente a `"Seguro contra todo riesgo"`.
  - [x] Aplicar rebranding con paleta Bordó en [`PricingPage.tsx`](../src/features/pricing/PricingPage.tsx), [`BulkPriceAdjuster.tsx`](../src/features/pricing/components/BulkPriceAdjuster.tsx) y [`TariffTableRow.tsx`](../src/features/pricing/components/TariffTableRow.tsx).
  - [ ] Evaluar y remover la columna `"Tipo"` en [`TariffTable.tsx`](../src/features/pricing/components/TariffTable.tsx) si no se utiliza operativamente.
- [x] **Simplificación de UI**
  - [x] Eliminar el panel o sección de historial de cambios de tarifas.

---

## 9. Métricas & Reportes [Admin]

- [ ] **Nueva Vista Independiente de Métricas (`/metricas`)**
  - [x] Crear scaffold de la vista [`src/features/metrics/MetricsPage.tsx`](../src/features/metrics/MetricsPage.tsx).
  - [ ] Configurar la ruta `/metricas` en [`src/App.tsx`](../src/App.tsx) accesible únicamente para `admin` y `superadmin` (`AdminRoute`) y agregarla en [`nav-items.ts`](../src/components/layout/nav-items.ts).
  - [ ] Reubicar aquí las tarjetas e indicadores de facturación, señas cobradas, saldos por cobrar y volumen de comensales.
  - [ ] Incorporar las estadísticas específicas solicitadas por el cliente en las Meets 3 y 4:
    - [ ] **Estadística de ticket promedio por evento.**
    - [ ] **Métrica del día más solicitado** (Viernes vs Sábado vs Domingo).
    - [ ] **Métrica de la estación / isla más solicitada.**

---

## 10. Comandas de Producción [Cocina]

_(Alineado con el modelo de referencia en [`cliente.md`](../.doc/cliente.md) y acuerdos de la Meet 5)_

- [ ] **Estructura del Ticket / Ficha de Producción ([`ComandaTicket.tsx`](../src/features/production/components/ComandaTicket.tsx) y [`DownloadButton.tsx`](../src/features/production/components/DownloadButton.tsx))**
  - [x] Modelo de comanda de cocina estructurado sin información de precios ni montos monetarios.
  - [x] Número identificador correlativo de comanda (`EV-XXXX` / `CMD-EV-XXXX`).
  - [x] Rebranding visual en Bordó agrupado por fecha en [`ComandasPage.tsx`](../src/features/production/ComandasPage.tsx) con indicador de cantidad de servicios en la jornada y **descarga de PDF técnico con `jsPDF`** ([`DownloadButton.tsx`](../src/features/production/components/DownloadButton.tsx)).
  - [ ] Completar campos del **Modelo de Orden de Comanda oficial** en tarjeta UI y en el PDF generado:
    - [ ] Indicador explícito de **`[Turno Único]`** vs **`[Evento Concurrente]`** junto a la cantidad de PAX.
    - [ ] **Menú Contratado y Mise en Place unificados:** mostrar el listado de las 5 estaciones marcando con `[X]` las contratadas (con cantidad de pax y platos estándar de la isla) y con `[ ]` las no contratadas (`--`), más Barra Libre si aplica.
    - [ ] **Requerimientos Especiales:** incluir todas las categorías (**Sin TACC / Celíacos**, **Vegetarianos**, **Veganos**, **Sin Sal**, **Alergias** y **Otros**), aclarando que la adaptación aplica a **todas las islas contratadas** y la leyenda `"Separar y rotular menús especiales"`.
    - [ ] **Estado de Producción:** mostrar leyenda **`ESTADO: Aprobado para Producción`** (automático al contar con seña abonada o pago total, sin firma física ni código QR).
- [x] **Navegación Operativa**
  - [x] Acceso directo a la comanda mediante enlace o clic en el evento desde la tabla de eventos (`/comandas/:eventId`).

---

## 11. Alcance Excluido del MVP (Documentado por Acuerdo en Meets 4 y 5)

1. **Módulo de Control de Stock, Recetas Estándar e Insumos de Proveedores:** Queda descartado para este MVP todo el circuito de carga de recetas estándar por pax en gramos/kg, catálogo de insumos de proveedores, bloqueo/descuento automático de stock en depósito, alertas críticas de déficit por stock mínimo y adjunto de remitos/facturas de compra.
2. **Código QR y Firma Física en Comanda:** Descartados en la Meet 5 al reemplazarse por el acceso autenticado mediante el rol `cocina` y la aprobación automática para producción contra el pago de la seña.
