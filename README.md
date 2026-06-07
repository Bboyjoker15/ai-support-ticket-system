# AI Support Ticket System

> Plataforma de gestión de tickets de soporte potenciada con Inteligencia Artificial, construida sobre Next.js 16 y Supabase.

![Next.js](https://img.shields.io/badge/Next.js-16.2.6-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2.106.1-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

## Descripcion

**AI Support Ticket System** es una aplicacion web full-stack para la gestion integral de tickets de soporte tecnico, con un motor de Inteligencia Artificial que analiza, clasifica y prioriza automaticamente cada solicitud en el momento en que es creada.

El sistema implementa un modelo de control de acceso basado en roles (**RBAC**) con tres perfiles claramente diferenciados:

- **User (Cliente):** Reporta incidencias y da seguimiento al estado de sus tickets en tiempo real.
- **Agent (Agente tecnico):** Toma casos, atiende incidencias, conversa con el cliente y resuelve tickets.
- **Admin (Administrador):** Gestiona usuarios, roles, supervisa toda la operacion y consulta metricas ejecutivas.

Toda la logica de backend (persistencia, autenticacion, realtime, IA) vive en **Supabase**, lo que permite iterar rapidamente sin mantener un servidor propio.

## Tabla de contenidos

- [Caracteristicas](##-caracteristicas)
- [Demo](#-demo)
- [Arquitectura](#-arquitectura)
- [Stack tecnico](#-stack-tecnico)
- [Roles y permisos](#-roles-y-permisos)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Instalacion](#-instalacion)
- [Variables de entorno](#-variables-de-entorno)
- [Scripts disponibles](#-scripts-disponibles)
- [Esquema de base de datos](#-esquema-de-base-de-datos)
- [Integracion con IA](#-integracion-con-ia)
- [Consideraciones de seguridad](#-consideraciones-de-seguridad)
- [Despliegue](#-despliegue)
- [Roadmap](#-roadmap)
- [Contribucion](#-contribucion)
- [Licencia](#-licencia)
- [Contacto](#-contacto)

## Caracteristicas

- **Autenticacion completa** con Supabase Auth (sign up, sign in, sign out, gestion de sesion).
- **Control de acceso por roles (RBAC)** con un guard centralizado que protege todas las rutas de `/dashboard/*` y redirige segun el rol del usuario.
- **Tres areas diferenciadas** segun el rol: panel de cliente, mesa de operaciones del agente, panel ejecutivo del administrador.
- **Priorizacion automatica con IA:** cada ticket es analizado al crearse y se le asigna prioridad (`High` / `Medium` / `Low`), nivel de riesgo, clasificacion, resumen ejecutivo, sugerencias de resolucion y analisis para el cliente.
- **Sugerencia de respuesta IA** que el agente puede insertar con un solo clic en el chat.
- **Realtime end-to-end** con canales de Supabase: cambios en tickets, comentarios y notificaciones se reflejan al instante en todas las vistas conectadas.
- **Cuatro campanas de notificacion** con persistencia en `localStorage` y suscripcion Realtime:
  - Alertas criticas para agentes (riesgo alto).
  - Mensajes de chat no leidos para agentes.
  - Cambios de estado de tickets para clientes.
  - Mensajes de chat de soporte para clientes.
- **Chat bidireccional cliente-agente** integrado en el detalle de cada ticket, con UI diferenciada por emisor.
- **Centro de metricas ejecutivas (Manager)** con KPIs, distribucion por estado/prioridad, rendimiento por cliente y por agente.
- **Modo dual en el panel admin:** el administrador puede alternar entre vista de gestion (`Modo Admin`) y vista operativa (`Modo Agente`) sin perder su rol.
- **UI oscura moderna** con Tailwind CSS 4, gradientes por rol, animaciones y diseno responsive.
- **Auto-asignacion de tickets:** cuando un agente mueve un ticket a `In Progress`, se le asigna automaticamente.

## Demo

> Las capturas de pantalla y un GIF de demostracion se pueden anadir en esta seccion.
<img width="1397" height="748" alt="image" src="https://github.com/user-attachments/assets/143f9631-2908-4f70-97c5-4ed4e3c3795a" />
<img width="1398" height="752" alt="image" src="https://github.com/user-attachments/assets/81548c5e-9706-4bdf-ac64-f1f286ec00f7" />
<img width="1382" height="750" alt="Screenshot 2026-06-07 142841" src="https://github.com/user-attachments/assets/0872684e-c7b1-4c20-bb8c-651f079411e4" />
<img width="1382" height="751" alt="image" src="https://github.com/user-attachments/assets/48236bb8-bfe3-405b-ba67-480be55eeb75" />
<img width="1383" height="752" alt="image" src="https://github.com/user-attachments/assets/81c570a9-4a0d-4b04-ab26-1948ffe58a3f" />
<img width="1379" height="513" alt="image" src="https://github.com/user-attachments/assets/0c164016-3c5c-4d7e-b2c1-d31e1422a1a4" />
<img width="1385" height="755" alt="image" src="https://github.com/user-attachments/assets/0badc9b9-90ad-4c9a-94a0-8f52e3418fcd" />
<img width="1382" height="755" alt="image" src="https://github.com/user-attachments/assets/cf5e3965-a9b4-4345-95a3-2fb581450967" />
<img width="1382" height="328" alt="image" src="https://github.com/user-attachments/assets/65a70c43-0824-45c9-8df1-3c6238dbeb4b" />
<img width="1385" height="753" alt="image" src="https://github.com/user-attachments/assets/cbac840a-b49a-4344-bb2f-5e186ed82f27" />

## Arquitectura

```
+-------------------------+
|      Navegador web      |
|   (Next.js Client App)  |
+------------+------------+
             |
             | HTTPS / WebSocket
             v
+-------------------------+         +------------------+
|       Next.js 16        |  ---->  |    Supabase      |
|   (App Router, RSC +    |         |                  |
|    Client Components)   |         |  - Auth          |
|                         |         |  - PostgreSQL    |
|  - Auth Flow            |         |  - Realtime      |
|  - RBAC Guard           |         |  - Row Level     |
|  - Dashboards           |         |    Security      |
|  - Realtime Subs        |         |  - Edge Functions|
|  - Notifications        |         |    (IA pipeline) |
+-------------------------+         +------------------+
```

**Flujo de datos tipico (cliente reporta una incidencia):**

1. El cliente envia `title` + `description` desde su dashboard.
2. Next.js inserta la fila en `public.tickets` con `status = 'Open'`.
3. Un trigger o Edge Function de Supabase invoca el modelo de IA.
4. La IA rellena los campos `ai_*` (priority, summary, classification, suggestions, risk, analysis, suggested_reply, prompt, model_version, latency).
5. Si el analisis detecta riesgo alto, se crea automaticamente una fila en `public.notifications`.
6. Los canales Realtime propagan los cambios a todos los clientes conectados (campanas, listas, chats).

## Stack tecnico

| Tecnologia       | Version  | Proposito                                                          |
|------------------|----------|--------------------------------------------------------------------|
| Next.js          | 16.2.6   | Framework React con App Router, RSC y Streaming.                   |
| React            | 19.2.4   | Biblioteca UI con Server Components y Actions.                    |
| Tailwind CSS     | 4.x      | Sistema de diseno utility-first con soporte de temas inline.       |
| Supabase JS      | 2.106.1  | Cliente oficial para Auth, Postgres, Realtime y Storage.           |
| @tailwindcss/postcss | 4.x | Plugin PostCSS para Tailwind v4.                                   |
| ESLint           | 9.x      | Linter con `eslint-config-next`.                                   |
| PostCSS          | latest   | Pipeline de transformaciones CSS.                                  |

## Roles y permisos

| Capacidad                                           | User | Agent | Admin |
|-----------------------------------------------------|:----:|:-----:|:-----:|
| Registrarse y autenticarse                          |  Si  |  Si   |  Si   |
| Crear tickets propios                               |  Si  |  Si   |  Si   |
| Ver sus propios tickets                             |  Si  |  Si   |  Si   |
| Conversar en el chat de sus tickets                 |  Si  |  Si   |  Si   |
| Ver la bandeja global de tickets                    |  No  |  Si   |  Si   |
| Atender y auto-asignarse un ticket                  |  No  |  Si   |  Si   |
| Marcar un ticket como `Resolved`                    |  No  |  Si   |  Si   |
| Recibir alertas criticas (riesgo alto)              |  No  |  Si   |  Si   |
| Ver metricas del Manager (KPIs, distribuciones)     |  No  |  No   |  Si   |
| Cambiar roles de otros usuarios                     |  No  |  No   |  Si   |
| Expulsar usuarios de la plataforma                  |  No  |  No   |  Si   |
| Operar como agente desde el panel admin             |  No  |  No   |  Si   |

## Estructura del proyecto

```
frontend/
├── public/                          # Assets estaticos
├── src/
│   ├── app/                         # App Router de Next.js
│   │   ├── layout.js                # Layout raiz + fuentes Geist
│   │   ├── page.js                  # Landing por defecto
│   │   ├── globals.css              # Estilos globales + tema Tailwind
│   │   ├── login/
│   │   │   └── page.jsx             # Inicio de sesion
│   │   ├── register/
│   │   │   └── page.jsx             # Registro (crea fila en users con rol 'User')
│   │   └── dashboard/               # Rutas protegidas (guard RBAC)
│   │       ├── layout.jsx           # Guardian de seguridad por rol
│   │       ├── page.jsx             # Router inteligente segun rol
│   │       ├── user/                # Panel del cliente
│   │       │   ├── page.jsx
│   │       │   └── [id]/page.jsx    # Detalle + chat del cliente
│   │       ├── agent/               # Mesa de operaciones
│   │       │   ├── page.jsx
│   │       │   └── [id]/page.jsx    # Detalle + chat del agente
│   │       └── admin/               # Panel ejecutivo
│   │           ├── page.jsx
│   │           └── ticket/[id]/page.jsx
│   ├── components/                  # Componentes reutilizables
│   │   ├── AdminManagerDashboard.jsx    # Centro de metricas ejecutivas
│   │   ├── AgentTicketList.jsx          # Lista reutilizable agente/admin
│   │   ├── TicketAgentDetail.jsx        # Detalle unificado agente/admin
│   │   ├── NotificationBell.jsx         # Alertas criticas (agentes)
│   │   ├── MessageBell.jsx              # Mensajes de chat (agentes)
│   │   ├── UserNotificationBell.jsx     # Cambios de estado (clientes)
│   │   └── UserMessagesBell.jsx         # Mensajes de chat (clientes)
│   └── lib/
│       └── supabase.js              # Cliente Supabase singleton
├── .env.local                       # Variables de entorno (no commiteado)
├── next.config.mjs                  # Configuracion de Next.js
├── tailwind / postcss               # Configuracion de estilos
├── eslint.config.mjs                # Reglas de lint
├── jsconfig.json                    # Alias de paths (@/*)
└── package.json
```

## Instalacion

### Requisitos previos

- **Node.js** 20 o superior
- **npm** 10+ (o pnpm / yarn)
- Una instancia de **Supabase** activa (puedes crear una gratuita en [supabase.com](https://supabase.com))

### Pasos

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/<tu-usuario>/ai-support-ticket-system.git
   cd ai-support-ticket-system/frontend
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar las variables de entorno**

   Crea un archivo `.env.local` en la raiz de `frontend/` con las credenciales de tu proyecto Supabase (ver seccion siguiente).

4. **Preparar la base de datos en Supabase**

   - Crea las tablas y politicas RLS siguiendo la seccion [Esquema de base de datos](#-esquema-de-base-de-datos).
   - Configura la funcion o Edge Function que invoca la IA para poblar los campos `ai_*` al insertarse un ticket.
   - Habilita Realtime en las tablas `tickets`, `comments` y `notifications`.

5. **Crear el primer administrador**

   - Registrate normalmente desde la UI (esto crea un usuario con rol `User`).
   - Desde el panel de Supabase (Table Editor), cambia manualmente el valor de `role` a `Admin` en la fila correspondiente de `public.users`.

6. **Levantar el servidor de desarrollo**

   ```bash
   npm run dev
   ```

   La aplicacion estara disponible en [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Crea un archivo `.env.local` en la raiz de `frontend/` con las siguientes variables:

| Variable                            | Descripcion                                                                | Requerida |
|-------------------------------------|----------------------------------------------------------------------------|:---------:|
| `NEXT_PUBLIC_SUPABASE_URL`          | URL publica de tu proyecto Supabase (`https://xxx.supabase.co`).          |     Si    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Clave anonima publica del proyecto. Se envia al cliente de forma segura.  |     Si    |

> Las variables usan el prefijo `NEXT_PUBLIC_` porque se exponen al navegador. La `anon key` esta protegida por las politicas RLS, por lo que es seguro incluirla en el bundle.

Ejemplo de `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Scripts disponibles

| Comando         | Descripcion                                            |
|-----------------|--------------------------------------------------------|
| `npm run dev`   | Inicia el servidor de desarrollo en `localhost:3000`.  |
| `npm run build` | Genera la build de produccion.                         |
| `npm run start` | Sirve la build de produccion (requiere `build` previo).|
| `npm run lint`  | Ejecuta ESLint con la configuracion de Next.js.        |

## Esquema de base de datos

El backend vive completamente en Supabase (PostgreSQL). El modelo de datos esta compuesto por **5 tablas** en el esquema `public` con **RLS habilitado** en todas ellas.

### Resumen

| Tabla           | Proposito                                                                 |
|-----------------|---------------------------------------------------------------------------|
| `users`         | Perfil de cada usuario, extiende `auth.users` con un `role` propio.       |
| `tickets`       | Incidencias reportadas, enriquecida con campos `ai_*` y asignacion.       |
| `comments`      | Mensajes de chat asociados a un ticket.                                   |
| `notifications` | Alertas criticas generadas por la IA o por el sistema.                   |
| `categories`    | Catalogo de categorias (reservada para uso futuro).                       |

### Tipos y enums

```sql
CREATE TYPE ticket_status AS ENUM ('Open', 'In Progress', 'Resolved');
```

El rol del usuario se valida con un `CHECK`:

```sql
CHECK (role IN ('Admin', 'Agent', 'User'))
```

### Tabla `public.users`

| Columna      | Tipo           | Nulo | Default                  | Notas                                  |
|--------------|----------------|:----:|--------------------------|----------------------------------------|
| `id`         | `uuid`         |  No  | -                        | PK; FK a `auth.users.id`.              |
| `email`      | `text`         |  No  | -                        | -                                      |
| `role`       | `text`         |  Si  | `'User'`                 | Valores permitidos: `Admin`/`Agent`/`User`. |
| `created_at` | `timestamptz`  |  No  | `timezone('utc', now())` | -                                      |

### Tabla `public.tickets`

| Columna              | Tipo           | Nulo | Default                  | Notas                                              |
|----------------------|----------------|:----:|--------------------------|----------------------------------------------------|
| `id`                 | `uuid`         |  No  | `gen_random_uuid()`      | PK.                                                |
| `user_id`            | `uuid`         |  No  | -                        | FK a `public.users.id` (cliente que reporta).      |
| `title`              | `text`         |  No  | -                        | -                                                  |
| `description`        | `text`         |  No  | -                        | -                                                  |
| `status`             | `ticket_status`|  No  | `'Open'`                 | Enum: `Open` / `In Progress` / `Resolved`.         |
| `assigned_to`        | `uuid`         |  Si  | -                        | FK a `auth.users.id` (agente responsable).         |
| `ai_priority`        | `text`         |  Si  | `'Medium'`               | `High` / `Medium` / `Low`.                         |
| `ai_risk_level`      | `text`         |  Si  | `'Low'`                  | Nivel de riesgo detectado por la IA.               |
| `ai_classification`  | `text`         |  Si  | -                        | Categoria tecnica del problema.                    |
| `ai_summary`         | `text`         |  Si  | -                        | Resumen ejecutivo para el agente.                  |
| `ai_suggestions`     | `text`         |  Si  | -                        | Sugerencias de resolucion.                         |
| `ai_analysis`        | `text`         |  Si  | -                        | Justificacion en lenguaje claro para el cliente.   |
| `ai_suggested_reply` | `text`         |  Si  | -                        | Respuesta sugerida al cliente.                     |
| `ai_prompt`          | `text`         |  Si  | -                        | Prompt enviado al modelo (trazabilidad).           |
| `ai_model_version`   | `text`         |  Si  | -                        | Version del modelo usado.                          |
| `ai_latency`         | `integer`      |  Si  | -                        | Latencia en ms del analisis.                       |
| `created_at`         | `timestamptz`  |  No  | `timezone('utc', now())` | -                                                  |
| `updated_at`         | `timestamptz`  |  No  | `timezone('utc', now())` | -                                                  |

### Tabla `public.comments`

| Columna      | Tipo          | Nulo | Default                  | Notas                                       |
|--------------|---------------|:----:|--------------------------|---------------------------------------------|
| `id`         | `uuid`        |  No  | `gen_random_uuid()`      | PK.                                         |
| `ticket_id`  | `uuid`        |  No  | -                        | FK a `public.tickets.id`.                   |
| `user_id`    | `uuid`        |  No  | -                        | FK a `public.users.id` (autor del mensaje). |
| `message`    | `text`        |  No  | -                        | -                                           |
| `created_at` | `timestamptz` |  No  | `timezone('utc', now())` | -                                           |

### Tabla `public.notifications`

| Columna      | Tipo          | Nulo | Default                  | Notas                                |
|--------------|---------------|:----:|--------------------------|--------------------------------------|
| `id`         | `uuid`        |  No  | -                        | PK.                                  |
| `ticket_id`  | `uuid`        |  Si  | -                        | FK a `public.tickets.id`.            |
| `title`      | `text`        |  No  | -                        | -                                    |
| `message`    | `text`        |  No  | -                        | -                                    |
| `priority`   | `text`        |  Si  | `'Low'`                  | Riesgo: `High` / `Medium` / `Low`.   |
| `is_read`    | `boolean`     |  Si  | `false`                  | -                                    |
| `created_at` | `timestamptz` |  No  | `timezone('utc', now())` | -                                    |

### Tabla `public.categories`

| Columna      | Tipo          | Nulo | Default         | Notas                       |
|--------------|---------------|:----:|-----------------|-----------------------------|
| `id`         | `bigint`      |  No  | identity        | PK.                         |
| `name`       | `text`        |  No  | -               | Unico.                      |
| `description`| `text`        |  Si  | -               | -                           |
| `created_at` | `timestamptz` |  No  | `now()`         | -                           |

> La tabla `categories` esta definida en el esquema pero **aun no se consume desde el frontend**. Esta reservada para una futura funcionalidad de categorizacion manual o taxonomias predefinidas.

### Relaciones (Foreign Keys)

```
public.users.id          -> auth.users.id
public.tickets.user_id   -> public.users.id
public.tickets.assigned_to -> auth.users.id
public.comments.ticket_id -> public.tickets.id
public.comments.user_id   -> public.users.id
public.notifications.ticket_id -> public.tickets.id
```

### Politicas de Row Level Security (resumen)

Todas las tablas tienen RLS habilitado. A continuacion el resumen de las politicas configuradas:

**`public.users`**

| Operacion | Regla                                                                 |
|-----------|-----------------------------------------------------------------------|
| SELECT    | Permitido para todos los roles (`USING: true`).                       |
| INSERT    | Permitido para usuarios autenticados (`auth.uid() = id`) y publico.   |
| UPDATE    | Un usuario solo puede actualizar su propio perfil (`auth.uid() = id`).|

**`public.tickets`**

| Operacion | Regla                                                                                  |
|-----------|----------------------------------------------------------------------------------------|
| SELECT    | Admin/Agent ven todos; un usuario ve los suyos + Agent ve los suyos.                   |
| INSERT    | Usuarios autenticados pueden crear tickets; el cliente solo puede crear los suyos.     |
| UPDATE    | Solo usuarios con rol `Agent` o `Admin` pueden modificar tickets.                      |

**`public.comments`**

| Operacion | Regla                                                                                  |
|-----------|----------------------------------------------------------------------------------------|
| SELECT    | Permitido para usuarios autenticados.                                                  |
| INSERT    | Permitido para usuarios autenticados.                                                  |

**`public.notifications`**

| Operacion | Regla                                                       |
|-----------|-------------------------------------------------------------|
| DELETE    | Permitido a los agentes (`USING: true`).                    |

**`public.categories`**

| Operacion | Regla                                            |
|-----------|--------------------------------------------------|
| (todas)   | RLS habilitado, sin policies documentadas aun.   |

## Integracion con IA

El sistema esta preparado para conectarse a cualquier modelo de lenguaje (OpenAI, Anthropic, Gemini, modelo local, etc.) que produzca un analisis estructurado de cada ticket. La integracion se realiza como una **caja negra** dentro de Supabase (trigger SQL, Edge Function o servicio externo) y se invoca automaticamente al insertarse una fila en `public.tickets`.

### Campos producidos por la IA

| Campo                  | Descripcion                                                       | Visible para                |
|------------------------|-------------------------------------------------------------------|-----------------------------|
| `ai_priority`          | Prioridad asignada (`High` / `Medium` / `Low`).                    | Agente, Admin, Cliente      |
| `ai_risk_level`        | Nivel de riesgo (`Low` / `Medium` / `High`).                       | Agente, Admin               |
| `ai_classification`    | Categoria tecnica del problema.                                   | Agente, Admin               |
| `ai_summary`           | Resumen ejecutivo del caso.                                       | Agente, Admin               |
| `ai_suggestions`       | Pasos sugeridos para resolver la incidencia.                      | Agente, Admin               |
| `ai_analysis`          | Explicacion en lenguaje claro para el cliente.                    | Cliente                     |
| `ai_suggested_reply`   | Borrador de respuesta que el agente puede insertar en el chat.    | Agente, Admin               |
| `ai_prompt`            | Prompt enviado al modelo (auditoria y reproducibilidad).           | Logs internos               |
| `ai_model_version`     | Version del modelo utilizada.                                     | Logs internos               |
| `ai_latency`           | Latencia en milisegundos del analisis.                             | Logs internos               |

### Disparadores

- **Creacion de ticket:** la IA rellena los campos `ai_*` y, si `ai_priority = 'High'`, inserta una fila en `public.notifications` que es recibida en tiempo real por las campanas de los agentes.
- **Reanalisis opcional:** la arquitectura permite volver a invocar la IA si el ticket se actualiza, conservando trazabilidad mediante `ai_prompt`, `ai_model_version` y `ai_latency`.

## Consideraciones de seguridad

> Antes de llevar este sistema a produccion, revisa y endurece las siguientes politicas RLS que actualmente son permisivas:

- **`public.users` (SELECT):** existen politicas con `USING: true`, lo que expone la tabla completa de perfiles a cualquier rol. Recomendacion: restringir a `auth.uid() = id` o a roles `Admin`/`Agent`.
- **`public.tickets` (INSERT):** existe una politica con `WITH CHECK: true` que permite a cualquier usuario autenticado insertar tickets. En la practica, la app solo inserta con `auth.uid() = user_id`, pero la politica podria permitir suplantacion. Recomendacion: cambiar a `WITH CHECK: (auth.uid() = user_id)`.
- **`public.comments` (SELECT):** las politicas usan `USING: true`. En esta app los comentarios se filtran en el cliente por `ticket_id`, pero a nivel BD todos los usuarios autenticados pueden leer todos los comentarios. Recomendacion: condicionar al `ticket.user_id = auth.uid()` o al rol del lector.
- **Anon key en el cliente:** el archivo `.env.local` contiene la `anon key` publica de Supabase. Esto es seguro gracias a RLS, pero es importante que las politicasesten correctamente configuradas antes de exponer la app.
- **Rate limiting:** la aplicacion no implementa rate limiting por IP/usuario. Para produccion, considera agregar throttling en Supabase o un middleware (por ejemplo Upstash) para evitar abuso en el endpoint de creacion de tickets.

## Despliegue

### Opcion recomendada: Vercel

1. Sube el repositorio a GitHub.
2. Importa el proyecto en [vercel.com](https://vercel.com/new).
3. Configura el **Root Directory** como `frontend/`.
4. Agrega las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en la seccion **Environment Variables**.
5. Despliega. Cada `push` a la rama principal generara un nuevo deploy automatico.

### Build local

```bash
npm run build
npm run start
```

## Roadmap

- [ ] Suite de tests unitarios y de integracion (Vitest + Testing Library).
- [ ] Autenticacion de dos factores (2FA) para agentes y administradores.
- [ ] Adjuntos e imagenes en tickets y comentarios (Supabase Storage).
- [ ] Busqueda full-text y filtros avanzados en la bandeja del agente.
- [ ] Dashboard BI con series de tiempo (tickets por dia, tiempo medio de resolucion).
- [ ] Reasignacion manual de tickets entre agentes desde el panel admin.
- [ ] Webhooks salientes para integraciones externas (Slack, email, Teams).
- [ ] Internacionalizacion (i18n) para soportar multiples idiomas.
- [ ] Modo claro / oscuro configurable por el usuario.

## Contribucion

Las contribuciones son bienvenidas. Para colaborar:

1. Haz un fork del repositorio.
2. Crea una rama con un nombre descriptivo:

   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```

3. Realiza commits atomicos con mensajes claros:

   ```bash
   git commit -m "feat: agregar busqueda full-text en bandeja de agente"
   ```

4. Asegurate de que `npm run lint` pase sin errores.
5. Abre un Pull Request describiendo el cambio y, si aplica, adjunta capturas o GIFs.

### Convenciones

- Estilo de codigo: el definido por `eslint-config-next` (`npm run lint`).
- Commits: se recomienda [Conventional Commits](https://www.conventionalcommits.org/).
- Branching: `main` (estable) y ramas `feature/*`, `fix/*`, `chore/*`.

## Licencia

Este proyecto se distribuye bajo la licencia **MIT**.

```
MIT License

Copyright (c) 2026

Se concede permiso, de forma gratuita, a cualquier persona que obtenga una copia
de este software y de los archivos de documentacion asociados...
```

Consulta el archivo [`LICENSE`](./LICENSE) para el texto completo.

## Contacto

- **Autor:** Cesar Velasquez
- **GitHub:** [@Bboyjoker15](https://github.com/Bboyjoker15)
- **Issues:** [github.com/tu-usuario/ai-support-ticket-system/issues](https://github.com/tu-usuario/ai-support-ticket-system/issues)

---

Hecho con Next.js, Supabase y un poquito de IA.
