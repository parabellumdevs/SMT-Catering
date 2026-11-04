# Backlog de Tareas e Issues — SMT Catering

Documento maestro de seguimiento de tareas completadas y pendientes, contrastado contra el relevamiento completo de reuniones con el cliente (Meets 1 a 5), especificaciones operativas y el estado real del código en el repositorio.

---

## 1. Backend, Infraestructura & Base de Datos

- [x] **Modelado de Base de Datos Relacional (según `docs/MER_v3.xml`)**
  - [x] Estructura de tablas, restricciones `CHECK` y relaciones en [`server/db/schema.sql`](../server/db/schema.sql) alineadas con `MER_v3`: `cliente`, `usuario_staff`, `estacion`, `reserva`, `detalle_reserva_estacion`, `restriccion_alimentaria`, `pago`, `comanda_produccion`, `tarifas` y `password_reset_tokens`.
  - [x] Script de datos iniciales y de prueba ([`server/db/seed.sql`](../server/db/seed.sql)) con casos realistas: clientes corporativos B2B, eventos pasados saldados, eventos futuros señados, eventos concurrentes ($\le 60$ comensales), seguro contra todo riesgo (`$80.000`) y restricciones alimentarias.
  - [x] Migración y conexión activa con **Neon PostgreSQL Cloud** ([`server/db/client.ts`](../server/db/client.ts), [`server/db/migrate-neon.mjs`](../server/db/migrate-neon.mjs) y comando `npm run db:setup`).
  - [x] Configuración de despliegue serverless en Vercel ([`vercel.json`](../vercel.json), [`api/index.js`](../api/index.js) y [`server/vercel.ts`](../server/vercel.ts)).
  - [x] Exclusión en [`.gitignore`](../.gitignore) de variables de entorno `.env` y archivos locales.
- [x] **Autenticación, Sesiones & Arquitectura de Seguridad**
  - [x] Firma y verificación criptográfica real de JWT (`HMAC-SHA256`) en [`server/lib/jwt.ts`](../server/lib/jwt.ts) transportado en cookie HTTP-only (`smt_session`, `SameSite=Lax`).
  - [x] Hashing seguro de contraseñas con `scrypt` nativo y soporte de compatibilidad en [`server/lib/passwords.ts`](../server/lib/passwords.ts).
  - [x] Endpoint `GET /api/auth/me` para hidratar sesión del usuario autenticado (`id`, `username`, `fullName`, `email`, `role`).
  - > **Principio de Seguridad vs UX:**
  - > - **Seguridad Real (Backend):** El servidor valida la cookie JWT en cada petición protegida y rechaza accesos no autorizados con `401`/`403`.
  - > - **Renderizado UI (Frontend):** Al iniciar la app, el frontend consulta `GET /api/auth/me` y guarda la sesión en `useAuthStore` para adaptar la navegación en `AppShell` y ocultar controles según el rol.
- [x] **Sistema de Roles y Permisos (RBAC)**
  - [x] Definición de los 4 roles del sistema en contratos compartidos ([`shared/types/roles.ts`](../shared/types/roles.ts)): `superadmin`, `admin`, `cocina` y `cliente`.
  - [x] Guardias de ruta en frontend ([`src/App.tsx`](../src/App.tsx)) para proteger vistas autenticadas (`ProtectedRoute`) y rutas administrativas (`AdminRoute`).
- [x] **Proxy de Desarrollo & Cliente HTTP Unificado**
  - [x] Proxy de Vite en [`vite.config.ts`](../vite.config.ts) (`/api` -> `http://localhost:3001`) para transporte transparente de cookies.
  - [x] Cliente HTTP centralizado ([`src/lib/api.ts`](../src/lib/api.ts)) con `credentials: 'include'`.
- [x] **Gestión Centralizada de Usuarios en la App (`/usuarios`)**
  - [x] Vista integrada en [`src/features/users/UsersPage.tsx`](../src/features/users/UsersPage.tsx) en reemplazo de AdminJS externo.
  - [x] Endpoints protegidos en backend (`GET /api/users`, `POST /api/users/staff`, `PATCH /api/users/staff/:id`, `DELETE /api/users/staff/:id`, `PATCH /api/users/clients/:id`).
  - [x] Pestañas diferenciadas para Equipo Interno (Staff) y Clientes Corporativos B2B, con alta, edición de roles, activación/inhabilitación y blanqueo de contraseña.
- [x] **Unificación de Contratos, Esquemas y Conexión a API Real**
  - [x] Contratos TypeScript compartidos en [`shared/types/`](../shared/types) (`modelos.ts`, `events.ts`, `tariffs.ts`, `auth.ts`) y esquemas Zod en [`shared/schemas/`](../shared/schemas).
  - [x] Remoción definitiva de mocks (`mock-data.ts`) y conexión de stores (`eventStore`, `tariffStore`, `authStore`) contra la API real.
- [ ] **Consolidación y Desduplicación de Arquitectura Backend**
  - [ ] Unificar el servidor activo ([`server/index.ts`](../server/index.ts), conectado a PostgreSQL/Neon con tablas del `MER_v3` en español) con la estructura modular de [`server/modules/`](../server/modules), eliminando o migrando los servicios desconectados que aún referencian tablas antiguas en inglés (`events`, `stations`, `event_dietary`).

---

## 2. Global, UI & Sistema de Diseño

- [x] **Estandarización de Estilos & Librerías**
  - [x] Confirmado Tailwind CSS 4 + Radix UI como base oficial de estilos.
  - [ ] Garantizar consistencia visual de componentes (botones pill, modales, formularios y tablas) según el prototipo de Figma.
- [ ] **Actualización de Paleta de Colores (Identidad Bordó)**
  - [ ] Reemplazar el color primario violeta actual (`#533afd`) en los tokens `@theme` de [`src/index.css`](../src/index.css) por la paleta **Bordó** definida como identidad de marca por el cliente.
- [ ] **Controles de Formulario**
  - [ ] Ocultar flechas nativas (`spinners` / `steppers`) en todos los inputs numéricos (`input[type=number]`) mediante reglas globales en [`src/index.css`](../src/index.css).
- [x] **Navegación Dinámica por Rol**
  - [x] Configurar [`AppShell.tsx`](../src/components/layout/AppShell.tsx) y [`nav-items.ts`](../src/components/layout/nav-items.ts) para renderizar únicamente las secciones habilitadas según el rol del usuario conectado.

---

## 3. Login & Autenticación

- [x] **Recuperación de Contraseña**
  - [x] Enlace `"¿Olvidaste tu contraseña?"` en [`LoginPage.tsx`](../src/features/login/LoginPage.tsx).
  - [x] Modal [`ForgotPasswordModal.tsx`](../src/features/login/ForgotPasswordModal.tsx) y endpoints `POST /api/auth/forgot-password` y `POST /api/auth/reset-password` con token temporal.
- [x] **Registro de Nuevos Usuarios (`cliente` B2B)**
  - [x] Esquema Zod ([`shared/schemas/auth.schema.ts`](../shared/schemas/auth.schema.ts)), endpoint `POST /api/auth/register` y modal [`RegisterModal.tsx`](../src/features/login/RegisterModal.tsx) con asignación automática del rol `cliente`.
  - [ ] Agregar campos opcionales/requeridos del `MER_v3` y RF-01 en el registro B2B: **Fecha de aniversario/fundación de la empresa (`fecha_aniversario`)** y **Dirección legal (`direccion_legal`)**.
- [x] **Acceso Total de Superadmin**
  - [x] Permisos integrales para `superadmin` en toda la plataforma y gestión de staff en `/usuarios`.

---

## 4. Perfil & Configuración Personal [Cliente]

- [x] **Acceso a Configuración**
  - [x] Ícono de engranaje en barra superior, sidebar y barra móvil de [`AppShell.tsx`](../src/components/layout/AppShell.tsx) para el rol `cliente`.
- [x] **Gestión de Datos Personales y de Empresa**
  - [x] Pantalla [`ProfilePage.tsx`](../src/features/profile/ProfilePage.tsx) conectada a `GET /api/client/profile` y `PUT /api/client/profile` (razón social, CUIT de solo lectura, responsable, cargo, email, teléfono y dirección legal).
  - [ ] Permitir visualizar y editar la **Fecha de aniversario de la empresa (`fecha_aniversario`)** en [`ProfilePage.tsx`](../src/features/profile/ProfilePage.tsx).
- [x] **Cambio de Contraseña**
  - [x] Formulario de actualización de contraseña conectado a `POST /api/client/change-password` con validación de clave actual.

---

## 5. Cotizador en Tiempo Real [Cliente]

- [ ] **Validación de Ubicación y Radio de Cobertura (20 km)**
  - [x] Regla de distancia máxima $\le 20\text{ km}$ definida en esquema Zod ([`shared/schemas/quotation.schema.ts`](../shared/schemas/quotation.schema.ts)) y columna `distancia_km` en tabla `reserva`.
  - [ ] Incorporar en la UI del cotizador ([`QuotationPage.tsx`](../src/features/quotation/QuotationPage.tsx)) el bloque de **Dirección del evento** y validación de radio máximo de **20 km a la redonda** respecto de la sede central de SMT Catering (**Monserrat, Venezuela 1478, CABA**).
- [ ] **Selector de Islas / Estaciones y Menú Oficial**
  - [ ] Actualizar en [`src/lib/constants.ts`](../src/lib/constants.ts) y [`server/db/seed.sql`](../server/db/seed.sql) la descripción gastronómica oficial de las **5 estaciones**:
    1. **Estación Entradas:** Tabla de quesos (Parmesano, Gouda, Roquefort), Tabla de fiambres (Jamón crudo, Jamón cocido, Salame de colonia) y Brochettes (Caprese y mixtos de pollo/vegetales).
    2. **Estación Pastas:** Ñoquis de papa y Sorrentinos de jamón y queso, con dos opciones de salsa (Fileto clásica y Salsa Parisienne).
    3. **Estación Parrilla:** Asado banderita de ternera, Mini chorizos bombón, Pollo asado, aderezos y carbón/leña proporcional por comensal.
    4. **Estación Asiática:** Wok de verduras de estación (sola y opción con pollo) y Sushi rolls variados (Salmon Roll, Veggie Roll y Philadelphia).
    5. **Estación Dulce:** 5 variedades de shots de postres (Chocotorta, Lemon Pie, Cheesecake de frutos rojos, Mousse de chocolate y Oreotorta).
  - [ ] Incorporar imágenes ilustrativas de alta calidad para cada estación en [`StationSelector.tsx`](../src/features/quotation/components/StationSelector.tsx).
- [x] **Adicionales**
  - [x] Eliminada la opción "Mantelería" y "Cubiertos" de los adicionales, manteniendo únicamente la **Barra Libre de Bebidas / Tragos** opcional cotizada por comensal.
- [ ] **Restricciones Alimentarias**
  - [x] Tipado de modelo para `"Otros"` con detalle y cantidad ([`shared/types/events.ts`](../shared/types/events.ts)).
  - [ ] Incorporar en [`DietaryMatrix.tsx`](../src/features/quotation/components/DietaryMatrix.tsx) el campo **"Sin sal (Hipertensión)"** y la opción **"Otros"** (con descripción personalizada y cantidad exacta de comensales).
  - [ ] Asegurar que `POST /api/events` y `GET /api/events` en [`server/index.ts`](../server/index.ts) persistan y reconstruyan todas las categorías de restricciones alimentarias, manteniendo la validación de que la suma de dietas especiales no supere el total de invitados.
- [ ] **Fecha del Evento, Horarios & Disponibilidad Concurrente**
  - [x] Reglas base definidas en esquema Zod ([`shared/schemas/quotation.schema.ts`](../shared/schemas/quotation.schema.ts)).
  - [x] Selección en calendario restringida exclusivamente a días **viernes, sábados y domingos** ([`AvailabilityCalendar.tsx`](../src/features/quotation/components/AvailabilityCalendar.tsx)).
  - [ ] Unificar constante de **antelación mínima de reserva** entre [`src/lib/constants.ts`](../src/lib/constants.ts) (`14` días) y [`shared/schemas/quotation.schema.ts`](../shared/schemas/quotation.schema.ts) (`15` días).
  - [ ] **Franja horaria y duración del servicio:**
    - [ ] Agregar selector de horario en la UI del cotizador dentro de la franja de atención nocturna de **19:00 a 00:00 hs**.
    - [ ] Validar duración máxima de **3 horas** por evento (inicio permitido entre las 19:00 y las 21:00 hs para finalizar a más tardar a las 00:00 hs).
  - [ ] **Regla de eventos concurrentes en una misma noche (Optimización de turnos):**
    - [ ] Reflejar en [`AvailabilityCalendar.tsx`](../src/features/quotation/components/AvailabilityCalendar.tsx) y validar en `POST /api/events` ([`server/index.ts`](../server/index.ts)): si una fecha tiene 1 evento confirmado de **$\le 60$ comensales**, mantener la fecha habilitada para un **2.º evento** de hasta **60 comensales** (bloquear la fecha únicamente si ya hay un evento de $> 60$ pax, si ya existen 2 eventos agendados, o si el usuario actual cotiza $> 60$ pax en una fecha con 1 evento previo).
- [ ] **Resumen Financiero & Checkout**
  - [x] Tarifa fija de **Seguro contra todo riesgo (`$80.000`)** incorporada en base de datos y sumada automáticamente al presupuesto.
  - [x] Cálculo de **Seña (50%)** que congela el precio y aprueba la orden para producción.
  - [ ] Permitir al cliente seleccionar en el checkout el porcentaje inicial a abonar: **50% (Seña obligatoria)** o **100% (Pago Total)**.
  - [ ] En [`PriceSummary.tsx`](../src/features/quotation/components/PriceSummary.tsx), renombrar el botón `"Confirmar evento"` por **`"Pagar"`** y eliminar el botón `"Compartir resumen"`.
  - [ ] Adaptar [`ConfirmEventModal.tsx`](../src/features/quotation/components/ConfirmEventModal.tsx) para el flujo de checkout del cliente: asociar automáticamente la reserva al cliente B2B autenticado (cuando el rol es `cliente`), presentar el modal informativo previo a la pasarela de pagos y emitir la reserva confirmada.

---

## 6. Mis Eventos [Cliente]

- [ ] **Ruteo, Navegación y Endpoint de Eventos Propios**
  - [x] Scaffold inicial en [`src/features/my-events/MyEventsPage.tsx`](../src/features/my-events/MyEventsPage.tsx).
  - [ ] Registrar la ruta `/mis-eventos` en [`src/App.tsx`](../src/App.tsx) y añadir el enlace **"Mis Eventos"** en [`src/components/layout/nav-items.ts`](../src/components/layout/nav-items.ts) para el rol `cliente`.
  - [ ] Implementar `GET /api/events/my-events` en [`server/index.ts`](../server/index.ts) filtrando las reservas pertenecientes al `id_cliente` autenticado.
- [ ] **Listado de Eventos y Estado de Cuenta**
  - [ ] Renderizar tarjetas/grilla con: código de reserva, fecha y horario, dirección, cantidad de comensales, estaciones contratadas, estado del evento y desglose de pago (total, seña abonada y saldo pendiente con aviso de vencimiento a 24 hs del evento).
- [ ] **Acciones Disponibles por Evento (Autogestión B2B)**
  - [ ] **Ver Detalle / Descargar Comprobante Comercial (PDF/Impresión):** modal o vista imprimible con el detalle del servicio contratado, seguro, montos abonados, saldo pendiente y políticas operativas (2.º comprobante oficial para el cliente).
  - [ ] **Pagar Saldo Restante (50%):** botón para abonar en línea el saldo pendiente (vencimiento: hasta **24 horas antes** del evento), registrando el pago en la tabla `pago` y actualizando el estado a `TOTALMENTE_SALDADO`.
  - [ ] **Reprogramación de Fecha:** permitir al cliente solicitar/cambiar la fecha de su evento sin recargo, verificando únicamente disponibilidad y cupo concurrente ($\le 60$ pax) en la nueva fecha elegida (sin restricción de 30 días).
  - [ ] **Cancelación de Reserva (con Regla de los 7 Días):** botón para cancelar el evento informando e impactando la política de cancelación:
    - Cancelación con **$\ge 7$ días (1 semana)** de anticipación: **reintegro del 100% de la seña abonada**.
    - Cancelación con **$< 7$ días** de anticipación: **sin reintegro de la seña** (el pedido ya ingresó en ventana de elaboración).

---

## 7. Eventos & Calendario [Admin & Cocina]

- [ ] **Migración a DataTable, Paginación & Ordenamiento**
  - [ ] Implementar tabla avanzada en [`EventTable.tsx`](../src/features/dashboard/components/EventTable.tsx) con paginación de hasta **15 registros por página**.
  - [ ] Agregar ordenamiento interactivo ascendente/descendente (`sortable`) en las columnas principales.
- [ ] **Filtros & Búsqueda**
  - [ ] Filtro por rango de fechas con soporte para consultar **eventos pasados/finalizados** (cumple la función del 3.er comprobante de registro histórico interno acordado con el cliente).
  - [ ] Buscador en tiempo real por nombre de empresa / cliente.
  - [ ] Filtro por estado del evento y estado de cobro.
  - [ ] Eliminar el botón de filtro rápido `"En riesgo logístico"` en [`DashboardPage.tsx`](../src/features/dashboard/DashboardPage.tsx).
- [ ] **Ajuste de Columnas (según Figma)**
  - [ ] Modificar la columna `"Total"`: exhibir el importe total arriba y, debajo en tipografía secundaria, el **saldo pendiente** (sin mencionar la seña en esa celda).
- [ ] **Acciones de Administración (`admin` y `superadmin`)**
  - [ ] Acción para **ver detalle completo** del evento y emitir su comprobante administrativo.
  - [ ] Acción para **editar parámetros** del evento (observaciones de cocina, estado operativo).
  - [ ] Acción para **reprogramar fecha/horario** manualmente validando disponibilidad en el calendario.
  - [ ] Acción para **registrar pago presencial/manual** (cuando el cliente abona efectivo o transferencia en la sede de Monserrat), insertando el registro en la tabla `pago` y actualizando la reserva a `TOTALMENTE_SALDADO` sin pasar por pasarela externa.
  - [ ] Acción para **cancelar reserva** (calculando automáticamente si corresponde devolución de seña según los 7 días de anticipación y dando de baja la comanda en cocina).
- [ ] **Separación de Vistas (Eventos vs Métricas)**
  - [ ] Retirar el componente [`KpiGrid.tsx`](../src/features/dashboard/components/KpiGrid.tsx) de [`DashboardPage.tsx`](../src/features/dashboard/DashboardPage.tsx) y trasladarlo a la vista exclusiva de `/metricas`.
- [ ] **Restricciones de Acceso para Rol Cocina (`cocina`)**
  - [ ] Aplicar sanitización real en `GET /api/events` dentro de [`server/index.ts`](../server/index.ts) cuando el usuario autenticado tiene rol `cocina` (no enviar montos monetarios ni estados de cobro en el JSON).
  - [ ] Ocultar en [`EventTable.tsx`](../src/features/dashboard/components/EventTable.tsx) y [`EventCards`](../src/features/dashboard/components/EventTable.tsx) las columnas `"Cobro"` y `"Total"`, los filtros financieros (`"Por cobrar"`) y las acciones de edición/cobro para el rol `cocina`.
  - [x] Navegación directa al detalle de la comanda (`/comandas/:eventId`) al hacer clic sobre el evento.

---

## 8. Gestión de Tarifas [Admin]

- [x] **Ajuste de Catálogo de Tarifas**
  - [x] Cargar en base de datos ([`server/db/seed.sql`](../server/db/seed.sql)) la tarifa fija de `"Seguro contra todo riesgo"` (`$80.000`) y excluir cubiertos y mantelería.
  - [x] Eliminar de la UI de tarifas los ítems `"Cubiertos"` y `"Mantelería"`.
  - [x] Visualizar y permitir actualizar en [`PricingPage.tsx`](../src/features/pricing/PricingPage.tsx) el monto fijo de `"Seguro contra todo riesgo"`.
  - [ ] Evaluar y remover la columna `"Categoría"` / `"Tipo"` en [`TariffTable.tsx`](../src/features/pricing/components/TariffTable.tsx) si no se utiliza operativamente.
- [x] **Simplificación de UI**
  - [x] Eliminado el panel de historial de cambios de tarifas.

---

## 9. Métricas & Reportes [Admin]

- [ ] **Nueva Vista Independiente de Métricas (`/metricas`)**
  - [x] Scaffold inicial en [`src/features/metrics/MetricsPage.tsx`](../src/features/metrics/MetricsPage.tsx).
  - [ ] Registrar la ruta `/metricas` en [`src/App.tsx`](../src/App.tsx) envuelta en `AdminRoute` y agregar el enlace **"Métricas"** en [`src/components/layout/nav-items.ts`](../src/components/layout/nav-items.ts) visible únicamente para `superadmin` y `admin`.
  - [ ] Trasladar aquí las tarjetas financieras (Facturación confirmada, Señas cobradas, Saldos pendientes por cobrar y Eventos activos).
  - [ ] Implementar los **KPIs y estadísticas solicitados por el cliente**:
    - [ ] **Ticket promedio por evento** (monto promedio facturado por reserva confirmada/completada).
    - [ ] **Día más solicitado** (comparativa de demanda entre Viernes, Sábado y Domingo).
    - [ ] **Estación / Isla más solicitada** (ranking de frecuencia de contratación de cada estación gastronómica y barra libre).

---

## 10. Comandas de Producción [Cocina]

*(Alineado con el modelo de referencia provisto por SMT Catering y las definiciones de la Meet 5)*

- [ ] **Estructura del Ticket / Orden de Comanda ([`ComandaTicket.tsx`](../src/features/production/components/ComandaTicket.tsx))**
  - [x] Prohibición estricta cumplida: cero exposición de precios, señas o saldos monetarios.
  - [ ] Adaptar el diseño visual del ticket al **Modelo de Orden de Comanda oficial** de SMT Catering:
    - [ ] **Encabezado:** `SMT CATERING — ORDEN DE COMANDA #XXXX`, **Fecha**, **Hora de servicio** (ej. `20:00 hs`), **Dirección de entrega** y **Cliente (Razón Social)**.
    - [ ] **Capacidad y Modalidad de Turno:** mostrar `CANT. INVITADOS: XX PAX` acompañado de la etiqueta automática **`[Turno Único]`** o **`[Evento Concurrente]`** (cuando coexisten 2 eventos de $\le 60$ pax en la misma noche).
    - [ ] **Menú Contratado y Mise en Place unificados:** listar las 5 estaciones marcando con `[X]` las islas contratadas (indicando cantidad de pax y el desglose de platos estándar de cada isla) y con `[ ]` las no contratadas (`--`), además de indicar si incluye Barra Libre.
    - [ ] **Requerimientos Especiales (Dietas y Alérgenos):** exhibir claramente las cantidades de **Sin TACC (Celíacos)**, **Vegetarianos**, **Veganos**, **Sin Sal**, **Alergias** y **Otros**, aclarando que la adaptación aplica a **todas las estaciones contratadas** junto a la directiva operativa `"Separar y rotular menús especiales"`.
    - [ ] **Estado de Producción:** pie de comanda con leyenda **`ESTADO: Aprobado para Producción`** (aprobación automática al contar con seña abonada o pago total, sin firma física de chef ni código QR).
- [x] **Navegación e Impresión Operativa**
  - [x] Acceso directo a la comanda individual (`/comandas/:eventId`) y vista consolidada (`/comandas`) con soporte de impresión limpia (`@media print` / `.no-print`) y descarga `.txt`.

---

## 11. Alcance Excluido del MVP (Acuerdos de Relevamiento)

Los siguientes puntos discutidos durante las sesiones de relevamiento quedan **explícitamente excluidos** del alcance de este MVP:

1. **Módulo de Control de Stock, Recetas Estándar e Insumos de Proveedores:** Queda fuera del MVP la carga de recetas estándar en gramos/kilogramos por pax, el catálogo de insumos de proveedores, el descuento automático de materia prima en depósito, las alertas críticas de déficit por stock mínimo y la carga de remitos/facturas de recepción de mercadería.
2. **Código QR en Comanda y Firma Física del Chef:** Descartados en la Meet 5 en favor del acceso autenticado con rol `cocina` dentro de la plataforma y la aprobación automática para producción al registrarse el pago de la seña.
