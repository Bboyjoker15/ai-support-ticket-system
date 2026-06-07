# Manual de Usuario - AI Support Ticket System

> **Version:** 1.0.0  
> **Fecha:** Junio 2026  
> **URL de produccion:** `https://ai-support-ticket-system-flax.vercel.app`

---

## Tabla de contenidos

1. [Introduccion](#1-introduccion)
2. [Roles del sistema](#2-roles-del-sistema)
3. [Modulo: Cliente (User)](#3-modulo-cliente-user)
   - [Registro e inicio de sesion](#31-registro-e-inicio-de-sesion)
   - [Panel del cliente](#32-panel-del-cliente)
   - [Crear un ticket](#33-crear-un-ticket)
   - [Ver historial de tickets](#34-ver-historial-de-tickets)
   - [Chatear con soporte](#35-chatear-con-soporte)
   - [Notificaciones](#36-notificaciones)
4. [Modulo: Agente (Agent)](#4-modulo-agente-agent)
   - [Acceso al panel](#41-acceso-al-panel)
   - [Bandeja global de tickets](#42-bandeja-global-de-tickets)
   - [Atender un ticket](#43-atender-un-ticket)
   - [Resolver un ticket](#44-resolver-un-ticket)
   - [Chat con el cliente](#45-chat-con-el-cliente)
   - [Alertas y mensajes](#46-alertas-y-mensajes)
5. [Modulo: Administrador (Admin)](#5-modulo-administrador-admin)
   - [Acceso al panel](#51-acceso-al-panel)
   - [Pestana Resumen](#52-pestana-resumen)
   - [Pestana Manager](#53-pestana-manager)
   - [Pestana Tickets](#54-pestana-tickets)
   - [Pestana Usuarios](#55-pestana-usuarios)
   - [Modo Agente](#56-modo-agente)
6. [Cierre de sesion](#6-cierre-de-sesion)
7. [Solucion de problemas](#7-solucion-de-problemas)

---

## 1. Introduccion

**AI Support Ticket System** es una plataforma de gestion de tickets de soporte que utiliza Inteligencia Artificial para analizar, clasificar y priorizar automaticamente cada solicitud. El sistema permite a los clientes reportar incidencias, a los agentes tecnicos atenderlas y a los administradores supervisar toda la operacion.

### Requisitos tecnicos

- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Conexion a internet
- Cuenta de correo electronico valida

---

## 2. Roles del sistema

| Icono | Rol | Descripcion |
|-------|-----|-------------|
| 👤 | **Cliente (User)** | Reporta incidencias y da seguimiento |
| 🛠️ | **Agente (Agent)** | Atiende y resuelve tickets |
| ⚙️ | **Administrador (Admin)** | Supervisa y gestiona el sistema |

---

## 3. Modulo: Cliente (User)

### 3.1 Registro e inicio de sesion

**Registro:**

1. Navegue a la pagina principal y haga clic en "Registrarse"
2. Complete los campos:
   - **Correo electronico:** una direccion de email valida
   - **Contrasena:** minimo 6 caracteres
3. Haga clic en "Registrarse"
4. Aparecera un mensaje de confirmacion: "Registro exitoso. Redirigiendo al inicio de sesion..."
5. Sera redirigido automaticamente a la pagina de login

**Inicio de sesion:**

1. Ingrese su correo electronico y contrasena
2. Haga clic en "Ingresar"
3. Si las credenciales son correctas, sera redirigido a su panel personal
4. Si las credenciales son incorrectas, vera un mensaje de error en rojo

### 3.2 Panel del cliente

Al iniciar sesion como cliente, vera:

- **Formulario "Nuevo ticket":** para crear una nueva solicitud
- **Historial de tickets:** lista de todos sus tickets con filtros por estado
- **Campanas de notificacion:** en la parte superior (cambios de estado y mensajes)
- **Boton "Cerrar sesion":** en la parte superior

### 3.3 Crear un ticket

1. En el panel, localice la seccion "Nuevo ticket"
2. Ingrese un **titulo** descriptivo (ej: "No puedo acceder a mi cuenta")
3. Ingrese una **descripcion** detallada del problema
4. Haga clic en "Crear ticket"
5. El ticket aparecera inmediatamente en su historial
6. La IA analizara automaticamente el ticket y asignara prioridad, riesgo, clasificacion y resumen (esto puede tomar unos segundos)

### 3.4 Ver historial de tickets

- Los tickets se muestran en una tabla con columnas: ID, Titulo, Estado, Prioridad, Creado
- Use los botones de filtro: **All**, **Open**, **In Progress**, **Resolved**
- Haga clic en "Abrir" para ver el detalle de un ticket

### 3.5 Chatear con soporte

Al abrir un ticket, vera:

- **Estado "Open":** mensaje "Esperando a que un agente tome tu caso". El chat esta deshabilitado
- **Estado "In Progress":** un agente esta atendiendo su caso. Puede escribir mensajes en el chat
- **Estado "Resolved":** el ticket esta cerrado. El chat es solo lectura (no puede enviar mensajes nuevos)

Los mensajes del cliente aparecen etiquetados como **"Tu"** y los del soporte como **"Soporte"**.

### 3.6 Notificaciones

- **Campana ambar (Notificaciones):** muestra cambios de estado en sus tickets
- **Campana azul (Mensajes):** muestra nuevos mensajes de los agentes
- Haga clic en una notificacion para ir al detalle del ticket correspondiente
- Use "Limpiar todo" para eliminar notificaciones leidas

---

## 4. Modulo: Agente (Agent)

### 4.1 Acceso al panel

Al iniciar sesion como agente, sera redirigido automaticamente a la mesa de operaciones.

### 4.2 Bandeja global de tickets

La pantalla principal tiene dos pestanas:

| Pestana | Descripcion |
|---------|-------------|
| **Bandeja Global** | Todos los tickets del sistema que aun no han sido asignados |
| **Mis Casos** | Tickets que usted ha tomado para atender |

Ambas pestanas incluyen filtros de prioridad: **All**, **High**, **Medium**, **Low**.

Cada ticket muestra informacion clave incluyendo los campos generados por IA:
- **Prioridad:** High (rojo), Medium (ambar), Low (verde)
- **Riesgo:** nivel de riesgo detectado
- **Clasificacion:** tipo de problema (ej: "Technical Support")
- **Resumen IA:** descripcion breve generada automaticamente
- **Respuesta sugerida:** borrador de respuesta que puede usar

### 4.3 Atender un ticket

1. En la "Bandeja Global", busque un ticket sin asignar
2. Haga clic en **"Atender y asignarme"**
3. El ticket se movera automaticamente a "Mis Casos"
4. Recibira feedback inmediato (actualizacion optimista)

### 4.4 Resolver un ticket

1. Vaya a "Mis Casos" y abra el ticket que desea resolver
2. En el detalle, haga clic en **"Marcar como resuelto"**
3. El estado cambiara a `Resolved` y el ticket se cerrara

### 4.5 Chat con el cliente

En el detalle del ticket:
- Escriba su mensaje en el campo de texto
- Haga clic en "Enviar" (o presione Enter)
- Los mensajes del soporte aparecen etiquetados como **"Soporte"** y los del cliente como **"Cliente"**
- Use el boton **"Insertar en el chat"** para enviar rapidamente la respuesta sugerida por IA

### 4.6 Alertas y mensajes

- **Campana roja (Alertas):** notificaciones criticas (tickets con riesgo alto)
- **Campana azul (Mensajes):** nuevos mensajes de clientes en sus tickets asignados
- Las notificaciones se sincronizan en tiempo real

---

## 5. Modulo: Administrador (Admin)

### 5.1 Acceso al panel

Al iniciar sesion como administrador, accedera al panel de administracion con cuatro pestanas. El panel recuerda su ultimo modo de vista (Admin/Agente) gracias a `localStorage`.

### 5.2 Pestana Resumen

Visor ejecutivo de metricas globales:

| Metrica | Descripcion |
|---------|-------------|
| **Total Tickets** | Cantidad total en el sistema |
| **Open** | Tickets abiertos sin asignar |
| **In Progress** | Tickets en atencion |
| **Resolved** | Tickets resueltos |
| **High Priority** | Tickets con prioridad alta |
| **Total Usuarios** | Usuarios registrados |

### 5.3 Pestana Manager

Centro de metricas avanzadas con dos sub-pestanas:

**Pestana "Plataforma":**
- Distribucion de estados (grafico de barras)
- Tickets no asignados
- Tickets por prioridad
- Tiempo promedio de resolucion

**Pestana "Por cliente":**
- Lista de clientes con cantidad de tickets por estado
- Ultimo ticket de cada cliente

**Pestana "Por agente / admin":**
- Carga de trabajo por agente
- Tickets resueltos por agente
- Casos activos actuales

### 5.4 Pestana Tickets

Lista completa de todos los tickets del sistema con:
- Busqueda por texto
- Filtro por estado (Todos / Abiertos / En Progreso / Resueltos)
- Vista de detalle con opciones de administrador

### 5.5 Pestana Usuarios

Gestion de usuarios con tabla que muestra: Email, Rol, Fecha de registro.

Acciones disponibles:
- **Cambiar rol:** asigne role `'User'`, `'Agent'` o `'Admin'` a cualquier usuario
- **Expulsar:** elimine un usuario del sistema

### 5.6 Modo Agente

El administrador puede alternar al modo agente usando el toggle en la parte superior. En este modo, la interfaz se convierte en una mesa de operaciones identica a la del agente, permitiendo atender tickets directamente.

---

## 6. Cierre de sesion

Haga clic en el boton **"Cerrar sesion"** ubicado en la parte superior de cualquier panel. Sera redirigido a la pagina de inicio de sesion.

---

## 7. Solucion de problemas

### Error al iniciar sesion
- Verifique que el correo electronico y la contrasena sean correctos
- Asegurese de haberse registrado previamente
- Si olvido su contrasena, contacte al administrador

### No puedo crear un ticket
- Asegurese de haber iniciado sesion como Cliente o Agente
- Complete tanto el titulo como la descripcion

### No veo mis tickets
- Verifique el filtro de estado (All/Open/In Progress/Resolved)
- Si es agente, revise la pestana "Mis Casos"

### El chat no funciona
- Solo puede chatear cuando el estado del ticket es "In Progress"
- Si el ticket esta "Open", espere a que un agente lo tome
- Si el ticket esta "Resolved", el chat es solo lectura

### La IA no analiza mi ticket
- El analisis IA ocurre automaticamente via un proceso externo
- Si los campos IA no aparecen despues de unos minutos, el pipeline externo podria no estar activo
- Esto no impide la creacion y atencion del ticket

---

*Documentacion generada en Junio 2026 para el proyecto AI Support Ticket System.*
