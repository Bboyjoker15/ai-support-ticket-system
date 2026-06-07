# Diagramas de Flujo - AI Support Ticket System

> **Nota:** Todos los diagramas usan sintaxis Mermaid.js y son renderizados nativamente por GitHub.

---

## 1. Arquitectura del sistema

```mermaid
graph TB
    subgraph Cliente["Navegador Web"]
        A[React App<br/>Next.js 16]
    end

    subgraph Servidor["Next.js Server"]
        B[App Router<br/>Server Components]
    end

    subgraph Backend["Supabase Cloud"]
        C[Supabase Auth]
        D[(PostgreSQL<br/>5 tablas)]
        E[Realtime<br/>WebSocket]
    end

    subgraph IA["Motor de IA<br/>Caja Negra"]
        F[Pipeline de Analisis<br/>Edge Function / Webhook]
        G[LLM<br/>OpenAI / Anthropic]
    end

    A <-->|HTTP/HTTPS| B
    A <-->|REST API| C
    A <-->|REST API| D
    A <-->|WebSocket| E
    B <--> C
    B <--> D
    D -->|Trigger| F
    F --> G
    G -->|UPDATE ai_*| D
    D -->|CDC| E
```

---

## 2. Flujo de autenticacion

```mermaid
flowchart TD
    START([Usuario llega a /login]) --> FORM[Ingresa email + password]
    FORM --> LOGIN[Llama a supabase.auth.signInWithPassword]
    LOGIN --> CHECK{Respuesta exitosa?}
    CHECK -->|No| ERROR[Mostrar mensaje de error en rojo]
    ERROR --> FORM
    CHECK -->|Si| DASH[Redirige a /dashboard]
    DASH --> ROLE[dashboard/page.jsx obtiene rol desde public.users]
    ROLE --> DECIDE{Que rol tiene?}
    DECIDE -->|'Admin'| ADMIN[Redirige a /dashboard/admin]
    DECIDE -->|'Agent'| AGENT[Redirige a /dashboard/agent]
    DECIDE -->|'User'| USER[Redirige a /dashboard/user]
```

---

## 3. Flujo de registro

```mermaid
flowchart TD
    START([Usuario llega a /register]) --> FORM[Ingresa email + password]
    FORM --> SIGNUP[Llama a supabase.auth.signUp]
    SIGNUP --> CHECK{Auth devuelve usuario?}
    CHECK -->|No| ERROR[Mostrar mensaje de error]
    ERROR --> FORM
    CHECK -->|Si| INSERT[Insertar en public.users<br/>con role = 'User']
    INSERT --> SUCCESS[Mostrar registro exitoso]
    SUCCESS --> WAIT[Esperar 2 segundos]
    WAIT --> REDIRECT[Redirigir a /login]
```

---

## 4. Flujo de seguridad RBAC (Guard centralizado)

```mermaid
flowchart TD
    REQ([Navegacion a /dashboard/*]) --> AUTH["Obtener usuario via<br/>supabase.auth.getUser()"]
    AUTH --> CHECK_AUTH{Usuario autenticado?}
    CHECK_AUTH -->|No| LOGIN[Redirigir a /login]
    CHECK_AUTH -->|Si| ROLE[Obtener rol desde<br/>public.users]
    ROLE --> CHECK_ROLE{Tiene perfil en users?}
    CHECK_ROLE -->|No| LOGIN
    CHECK_ROLE -->|Si| PATH{Ruta solicitada?}
    
    PATH -->|/dashboard/admin/*| ADMIN{role == 'Admin'?}
    ADMIN -->|No| LOGIN
    ADMIN -->|Si| ALLOW[Permitir acceso]

    PATH -->|/dashboard/agent/*| AGENT{role == 'Agent'<br/>o 'Admin'?}
    AGENT -->|No| LOGIN
    AGENT -->|Si| ALLOW

    PATH -->|/dashboard/user/*| USER{role == 'User'?}
    USER -->|Si| ALLOW
    USER -->|No| STAFF{role == 'Agent'<br/>o 'Admin'?}
    STAFF -->|Si| REDIRECT_OWN[Redirigir al panel<br/>que corresponde]
    STAFF -->|No| LOGIN

    ALLOW --> RENDER[Renderizar children]
    RENDER --> END([Fin])

    subgraph NOTA["Nota"]
        N1["Si role == 'User' e intenta<br/>acceder /dashboard/agent/*<br/>o /dashboard/admin/*,<br/>sera redirigido a /login"]
        N2["El layout se ejecuta en<br/>CADA navegacion, no solo<br/>en la primera carga"]
    end
```

---

## 5. Flujo creacion de ticket + analisis IA

```mermaid
sequenceDiagram
    actor C as Cliente
    participant F as Frontend (Next.js)
    participant S as Supabase API
    participant DB as PostgreSQL
    participant IA as Pipeline IA

    C->>F: Escribe titulo + descripcion
    C->>F: Hace clic en "Crear ticket"
    F->>S: INSERT tickets<br/>{user_id, title, description, status='Open'}
    S->>DB: Guardar fila
    S-->>F: Devolver ticket creado
    F-->>C: Mostrar ticket en historial<br/>con status 'Open'

    Note over S,IA: (Proceso externo, puede tomar segundos)
    IA->>DB: SELECT nuevo ticket (campos title, description)
    IA->>IA: Analizar con modelo de lenguaje
    IA->>DB: UPDATE tickets SET<br/>  ai_priority = 'High',<br/>  ai_risk_level = 'Critical',<br/>  ai_classification = 'Technical Support',<br/>  ai_summary = '...',<br/>  ai_suggested_response = '...',<br/>  ai_confidence = 'High',<br/>  ai_sentiment = 'Negative',<br/>  ai_urgency = 'Immediate',<br/>  ai_impact = 'Major',<br/>  ai_response_time_est = '~15 min',<br/>  ai_escalation_reason = NULL

    alt Riesgo alto o Urgencia inmediata
        IA->>DB: INSERT notifications<br/>{type='critical', message='...'}
    end

    DB->>S: Realtime: cambio detectado en tickets
    S->>F: WebSocket: UPDATE en tickets[id]
    F-->>C: UI actualizada con campos IA

    alt Notificacion critica generada
        DB->>S: Realtime: INSERT en notifications
        S->>F: WebSocket: nueva notificacion
        F-->>C: Campana de alerta visible
        F-->>Agent: Campana roja con alerta critica
    end
```

---

## 6. Flujo de atencion del agente

```mermaid
sequenceDiagram
    actor A as Agente
    participant F as Frontend
    participant S as Supabase
    participant DB as PostgreSQL

    A->>F: Abre /dashboard/agent
    F->>S: SELECT tickets WHERE agent_id IS NULL
    S->>DB: Consultar bandeja global
    DB-->>S: Resultados
    S-->>F: Lista de tickets sin asignar
    F-->>A: Muestra bandeja global con campos IA

    A->>F: Hace clic en "Atender y asignarme"
    Note over F: Actualizacion optimista<br/>(UI cambia antes de la respuesta)
    F->>S: UPDATE tickets SET agent_id = auth.uid(),<br/>status = 'In Progress'
    S->>DB: Ejecutar UPDATE
    DB-->>S: Confirmacion
    S-->>F: Respuesta exitosa
    F-->>A: Ticket movido a "Mis Casos"
    Note over F: Si el UPDATE falla,<br/>se revierte el cambio visual

    A->>F: Hace clic en ticket para ver detalle
    F->>S: SELECT ticket + comments
    S-->>F: Detalle completo

    A->>F: Escribe mensaje en chat
    F->>S: INSERT comments<br/>{ticket_id, user_id, message, sender_type='support'}
    S->>DB: Guardar mensaje
    DB-->>S: OK
    S-->>F: Confirmacion
    F-->>A: Mensaje visible en chat

    A->>F: Hace clic en "Marcar como resuelto"
    F->>S: UPDATE tickets SET status = 'Resolved'
    S->>DB: Cambiar estado
    DB-->>S: OK
    S-->>F: Confirmacion
    F-->>A: Ticket marcado como resuelto
    Note over DB,S: Realtime notifica al cliente<br/>del cambio de estado
```

---

## 7. Flujo de chat en tiempo real

```mermaid
sequenceDiagram
    actor C as Cliente
    actor A as Agente
    participant FC as Frontend Cliente
    participant FA as Frontend Agente
    participant RS as Supabase Realtime
    participant DB as PostgreSQL

    Note over C,A: Estado del ticket: 'In Progress'

    C->>FC: Escribe mensaje y presiona Enter
    FC->>RS: INSERT comments<br/>{ticket_id, user_id, message, sender_type='user'}
    RS->>DB: Guardar
    DB-->>FC: Confirmacion
    FC-->>C: Mensaje visible (etiquetado "Tu")

    Note over DB,FA: Realtime propaga el cambio
    DB->>RS: Realtime: INSERT en comments
    RS->>FA: WebSocket: nuevo comentario
    FA-->>A: Mensaje visible (etiquetado "Cliente")
    FA->>FA: Campana azul de mensaje

    A->>FA: Escribe respuesta
    FA->>RS: INSERT comments<br/>{ticket_id, user_id, message, sender_type='support'}
    RS->>DB: Guardar
    DB-->>FA: Confirmacion
    FA-->>A: Mensaje visible (etiquetado "Soporte")

    DB->>RS: Realtime: INSERT en comments
    RS->>FC: WebSocket: nuevo comentario
    FC-->>C: Mensaje visible (etiquetado "Soporte")
    FC->>FC: Campana azul de mensaje
```

---

## 8. Diagrama de componentes

```mermaid
graph TB
    subgraph Pages["Paginas (src/app)"]
        LANDING["/page.js<br/>Landing (template)"]
        LOGIN["/login/page.jsx<br/>Inicio de sesion"]
        REGISTER["/register/page.jsx<br/>Registro"]
        
        subgraph DASH["/dashboard/*"]
            LAYOUT["layout.jsx<br/>RBAC Guard"]
            ROUTER["page.jsx<br/>Role Router"]
            
            subgraph USER["/dashboard/user"]
                UPAGE["page.jsx<br/>Crear + Historial"]
                UDETAIL["[id]/page.jsx<br/>Detalle + Chat"]
            end
            
            subgraph AGENT["/dashboard/agent"]
                APAGE["page.jsx<br/>Bandeja + Mis Casos"]
                ADETAIL["[id]/page.jsx<br/>Wrapper + Suspense"]
            end
            
            subgraph ADMIN["/dashboard/admin"]
                ADMPAGE["page.jsx<br/>Panel Admin"]
                ADMDETAIL["ticket/[id]/page.jsx<br/>Wrapper + Suspense"]
            end
        end
    end

    subgraph Components["Componentes (src/components)"]
        TAD["TicketAgentDetail.jsx<br/>Detalle unificado"]
        ATL["AgentTicketList.jsx<br/>Lista reutilizable"]
        AMD["AdminManagerDashboard.jsx<br/>Metricas ejecutivas"]
        NB["NotificationBell.jsx<br/>Alertas criticas"]
        MB["MessageBell.jsx<br/>Mensajes agente"]
        UNB["UserNotificationBell.jsx<br/>Notificaciones cliente"]
        UMB["UserMessagesBell.jsx<br/>Mensajes cliente"]
    end

    ADETAIL --> TAD
    ADMDETAIL --> TAD
    APAGE --> ATL
    ADMPAGE --> ATL
    ADMPAGE --> AMD
    APAGE --> NB
    ADMPAGE --> NB
    APAGE --> MB
    ADMPAGE --> MB
    UPAGE --> UNB
    UPAGE --> UMB

    subgraph Missing["Componente faltante (por implementar)"]
        TAA["TicketAgentActions.jsx<br/>Referenciado en TAD<br/>pero NO existe"]
    end
    TAD -.-> TAA
```

---

## 9. Diagrama de navegacion

```mermaid
flowchart LR
    LANDING["/ (Landing)"] --> LOGIN["/login"]
    LANDING --> REGISTER["/register"]
    REGISTER --> LOGIN
    LOGIN --> DASH["/dashboard"]

    DASH --> DASH_ADMIN["/dashboard/admin"]
    DASH --> DASH_AGENT["/dashboard/agent"]
    DASH --> DASH_USER["/dashboard/user"]
    
    DASH_ADMIN --> ADMIN_TICKET["/dashboard/admin/ticket/[id]"]
    DASH_AGENT --> AGENT_TICKET["/dashboard/agent/[id]"]
    DASH_USER --> USER_TICKET["/dashboard/user/[id]"]

    ADMIN_TICKET --> DASH_ADMIN
    AGENT_TICKET --> DASH_AGENT
    USER_TICKET --> DASH_USER

    DASH_ADMIN --> LOGIN
    DASH_AGENT --> LOGIN
    DASH_USER --> LOGIN

    style LANDING fill:#f9f,stroke:#333
    style LOGIN fill:#bbf,stroke:#333
    style REGISTER fill:#bbf,stroke:#333
    style DASH fill:#bfb,stroke:#333
```

---

## 10. Matriz de permisos RBAC

| # | Capacidad | User | Agent | Admin |
|:-:|-----------|:----:|:-----:|:-----:|
| 1 | Crear tickets | ✓ | ✓ | ✓ |
| 2 | Ver tickets propios | ✓ | ✓ | ✓ |
| 3 | Chatear en tickets propios | ✓ | ✓ | ✓ |
| 4 | Ver todos los tickets | ✗ | ✓ | ✓ |
| 5 | Atender / asignarse tickets | ✗ | ✓ | ✓ |
| 6 | Resolver tickets | ✗ | ✓ | ✓ |
| 7 | Ver metricas globales | ✗ | ✗ | ✓ |
| 8 | Gestionar roles de usuarios | ✗ | ✗ | ✓ |
| 9 | Expulsar usuarios | ✗ | ✗ | ✓ |

> **Leyenda:** ✓ = Permitido | ✗ = Denegado

---

## 11. Suscripciones Realtime

```mermaid
flowchart TD
    subgraph React["Componentes React"]
        UP["user/page.jsx"]
        UD["user/[id]/page.jsx"]
        AP["agent/page.jsx"]
        AD["admin/page.jsx"]
        ATL["AgentTicketList.jsx"]
        TAD["TicketAgentDetail.jsx"]
        NB["NotificationBell.jsx"]
        MB["MessageBell.jsx"]
        UNB["UserNotificationBell.jsx"]
        UMB["UserMessagesBell.jsx"]
    end

    subgraph Channels["Canales Realtime Supabase"]
        T["Tabla: tickets"]
        C["Tabla: comments"]
        N["Tabla: notifications"]
    end

    UP -->|"filter: user_id=auth.uid()"| T
    UD -->|"filter: id=[id]"| T
    UD -->|"filter: ticket_id=[id]"| C
    AP -->|"sin filtro"| T
    AD -->|"sin filtro"| T
    ATL -->|"sin filtro"| T
    TAD -->|"filter: id=[id]"| T
    TAD -->|"filter: ticket_id=[id]"| C
    NB -->|"sin filtro"| N
    NB -->|"sin filtro"| T
    MB -->|"filter: ticket_id IN [...]"| C
    UNB -->|"filter: user_id=auth.uid()"| T
    UMB -->|"verifica propiedad"| C
```

---

*Documentacion generada en Junio 2026 para el proyecto AI Support Ticket System.*
