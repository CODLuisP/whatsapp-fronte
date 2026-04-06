# WA BULK — Frontend Documentation

App React + TypeScript para envío masivo de mensajes WhatsApp. Conecta con un backend Node.js via REST API y Socket.IO en tiempo real.

---

## Stack

| Tecnología | Uso |
|---|---|
| React 18 + TypeScript | Framework principal |
| Tailwind CSS | Estilos utilitarios |
| Framer Motion (`motion/react`) | Animaciones y transiciones |
| Socket.IO Client | Progreso en tiempo real |
| Axios | HTTP requests (SendView) |
| Lucide React | Iconografía |

---

## Estructura de archivos

```
src/
├── App.tsx                # Layout principal, sidebar, routing, socket global
├── Connectionview.tsx     # Conexión WhatsApp / QR
├── Sendview.tsx           # Envío individual
├── MasivoSection.tsx      # Envío masivo + progreso en tiempo real
└── Campaignsview.tsx      # Historial de campañas
```

---

## App.tsx

Componente raíz. Maneja el layout completo y el estado global compartido.

### Responsabilidades

- Sidebar colapsable con navegación entre las 4 vistas
- Instancia única de Socket.IO (`socketRef`) compartida con los hijos
- Estado global de conexión WhatsApp (`connected`, `user`, `number`)
- Sistema de toasts animados con `AnimatePresence`
- Banner de advertencia cuando WhatsApp está desconectado

### Props que pasa a los hijos

```tsx
// ConnectionView
<ConnectionView
  apiUrl={`${BASE_URL}/api`}
  socket={socketRef.current}
  onStatusChange={(estado, usuario, numero) => { ... }}
/>

// SendView
<SendView
  connected={connected}
  baseUrl={BASE_URL}
  onToast={addToast}
/>

// MasivoSection
<MasivoSection
  socket={socketRef.current}
  isConnected={connected}
  onToast={addToast}
/>

// CampaignsView
<CampaignsView
  baseUrl={BASE_URL}
  onToast={addToast}
/>
```

### Toast

```tsx
addToast(message: string, type: "success" | "error" | "info")
```

Los toasts se auto-eliminan a los 3 segundos.

---

## ConnectionView

Vista de conexión y vinculación del número WhatsApp.

### APIs usadas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/status` | Estado actual de la conexión |
| `GET` | `/api/qr` | QR en base64 para escanear |
| `POST` | `/api/disconnect` | Cerrar sesión |

### Socket events escuchados

| Evento | Payload | Acción |
|---|---|---|
| `qr_actualizado` | `{ qr: string }` | Muestra nuevo QR |
| `estado_conexion` | `{ estado, usuario, numero, mensaje }` | Actualiza badge de estado |

### Estados posibles

```
desconectado → qr → conectando → conectado
                              ↓
                         reconectando → error
```

### Comportamiento

- El QR se refresca automáticamente cada 18 segundos si no hay conexión
- Al conectarse muestra el nombre de usuario y número vinculado
- El registro de logs muestra eventos en tiempo real con timestamps
- Botón "Cerrar sesión" solo habilitado cuando `estado === "conectado"`

---

## SendView

Envío de mensajes individuales a un número.

### APIs usadas

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/upload` | Subir archivo (imagen/documento) |
| `POST` | `/api/send/single` | Enviar el mensaje |

### Body de `/api/send/single`

```json
{
  "phone": "51987654321",
  "type": "texto | imagen | documento",
  "text": "Mensaje o caption",
  "file_url": "https://...",
  "filename": "archivo.pdf",
  "mime_type": "application/pdf"
}
```

### Tipos de mensaje

| Tipo | Campos requeridos |
|---|---|
| `texto` | `phone`, `text` |
| `imagen` | `phone`, `file_url`, `filename`, `mime_type` — `text` opcional como caption |
| `documento` | `phone`, `file_url`, `filename`, `mime_type` — `text` opcional como caption |

### Número de teléfono

El campo de teléfono está dividido en dos partes:
- **Código de país** — editable, default `51` (Perú)
- **Número local** — sin espacios ni guiones

El componente construye el número completo: `{codigoPais}{numeroLocal}` y evita duplicar el código si el usuario ya lo escribió.

### Upload de archivos

Usa `XMLHttpRequest` directamente (no fetch/axios) para obtener progreso real de subida. El servidor responde:

```json
{
  "exito": true,
  "datos": {
    "url": "https://...",
    "originalname": "foto.jpg",
    "mimetype": "image/jpeg"
  }
}
```

---

## MasivoSection

Vista principal de envío masivo. Todo en una sola pantalla, sin wizard de pasos.

### Layout

```
┌─────────────────────────────────┬──────────────────┐
│         Formulario              │ Panel de Progreso │
│                                 │                   │
│  • Nombre campaña               │  % completado     │
│  • Tipo (texto/imagen/doc)      │  Barra animada    │
│  • Dropzone (si aplica)         │  Stats 2x2        │
│  • Slider delay                 │  Log de eventos   │
│  • Textarea JSON                │                   │
│  • [Contador] [Iniciar/Cancelar]│  (banner al fin)  │
└─────────────────────────────────┴──────────────────┘
```

### APIs usadas

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/upload` | Subir archivo compartido para todos los mensajes |
| `POST` | `/api/send/bulk` | Lanzar la campaña |
| `POST` | `/api/campaigns/:id/cancel` | Cancelar campaña en curso |

### Body de `/api/send/bulk`

```json
{
  "campaign_name": "Promo Abril",
  "delay_ms": 3000,
  "messages": [
    {
      "phone": "51987654321",
      "text": "Hola Juan, tenemos una oferta 🎉",
      "type": "texto"
    },
    {
      "phone": "51912345678",
      "text": "Hola María",
      "type": "imagen",
      "file_url": "https://...",
      "filename": "promo.jpg",
      "mime_type": "image/jpeg"
    }
  ]
}
```

### Formato JSON de contactos

Cada objeto en el array acepta:

```json
{
  "phone": "51987654321",      // requerido
  "text": "Hola {nombre}!",   // requerido (se reemplaza {nombre})
  "nombre": "Juan"             // opcional — reemplaza la variable {nombre}
}
```

Si se selecciona tipo imagen o documento, el archivo subido se inyecta automáticamente en todos los mensajes del array.

### Variables de personalización

| Variable | Se reemplaza por |
|---|---|
| `{nombre}` | Campo `nombre` del objeto JSON |
| `{phone}` | El número del destinatario |

### Socket events

El componente se suscribe a la campaña activa emitiendo:

```js
socket.emit("suscribir_campaña", campaign_id)
```

Y escucha:

| Evento | Datos relevantes | Acción |
|---|---|---|
| `progreso_campaña` con `mensaje_enviado` | `telefono` | Línea verde en el log |
| `progreso_campaña` con `mensaje_fallido` | `telefono`, `error` | Línea roja en el log |
| `progreso_campaña` con `campaña_completada` | — | `isRunning=false`, banner verde |

### Estado `isRunning`

Controla qué botón se muestra en el `form-bottom`:

```
isRunning = false  →  botón "Iniciar campaña" (verde)
isRunning = true   →  botón "Cancelar campaña" (rojo)
```

`isRunning` se activa al recibir respuesta exitosa de `/api/send/bulk` y se desactiva cuando llega `campaña_completada` por socket o cuando el usuario cancela manualmente.

### Fix listener duplicado

El socket listener usa un `ref` (`activeCampaignIdRef`) en lugar de depender de `activeCampaignId` en el `useEffect`. Esto evita que se registren múltiples listeners al cambiar el ID de campaña activa:

```tsx
const activeCampaignIdRef = useRef<string|null>(null);
activeCampaignIdRef.current = activeCampaignId;

useEffect(() => {
  if (!socket) return;
  const handler = (data: any) => {
    const currentId = activeCampaignIdRef.current;
    if (currentId && data.campaign_id !== currentId) return;
    // ...
  };
  socket.on("progreso_campaña", handler);
  return () => socket.off("progreso_campaña", handler);
}, [socket]); // solo depende de socket
```

---

## CampaignsView

Historial completo de campañas con detalle y acciones.

### APIs usadas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/campaigns` | Lista todas las campañas |
| `GET` | `/api/campaigns/:id` | Detalle + mensajes de una campaña |
| `POST` | `/api/campaigns/:id/cancel` | Cancelar campaña activa |
| `DELETE` | `/api/campaigns/:id` | Eliminar del historial |

### Respuesta de `/api/campaigns`

```json
{
  "datos": {
    "campañas": [
      {
        "id": "uuid",
        "nombre": "Promo Abril",
        "estado": "completada | en_progreso | cancelada | error | pendiente",
        "total_mensajes": 100,
        "enviados": 98,
        "fallidos": 2,
        "pendientes": 0,
        "porcentaje_completado": 100,
        "delay_ms": 3000,
        "created_at": "2025-04-01T12:00:00Z"
      }
    ]
  }
}
```

### Respuesta de `/api/campaigns/:id`

```json
{
  "datos": {
    "campaña": { /* mismo objeto de arriba */ },
    "mensajes": [
      {
        "id": "uuid",
        "telefono": "51987654321",
        "texto": "Hola Juan",
        "tipo": "texto",
        "estado": "enviado | fallido | pendiente",
        "error": null
      }
    ]
  }
}
```

### Strip de métricas globales

Calculadas en el frontend a partir de la lista completa:

| Métrica | Cálculo |
|---|---|
| Campañas | `campaigns.length` |
| Activas | `filter(c => c.estado === "en_progreso").length` |
| Completadas | `filter(c => c.estado === "completada").length` |
| Mensajes enviados | `reduce((a,c) => a + c.enviados, 0)` |
| Mensajes totales | `reduce((a,c) => a + c.total_mensajes, 0)` |

### Colores por estado

| Estado | Color |
|---|---|
| `completada` | Verde `#25D366` |
| `en_progreso` | Azul `#58a6ff` |
| `cancelada` | Amarillo `#e3b341` |
| `error` | Rojo `#f85149` |
| `pendiente` | Gris `#8b949e` |

### Drawer de detalle

Se abre al hacer click en cualquier card. Carga los datos de `/api/campaigns/:id` y muestra:

- Stats: total, enviados, fallidos, pendientes
- Barra de progreso
- ID y delay de la campaña
- Tabla de mensajes filtrable por estado (todos / enviado / fallido / pendiente)
- Botón **"Cancelar"** — solo visible si `estado === "en_progreso"`
- Botón **"Eliminar"** — siempre visible, con `confirm()` previo

---

## Variables de entorno / Configuración

El `BASE_URL` está hardcodeado en cada componente. Para cambiarlo a producción, reemplaza:

```ts
// App.tsx
const BASE_URL = "http://localhost:3000";

// MasivoSection.tsx y CampaignsView.tsx  
const API = "http://localhost:3000/api";
```

---

## Resumen de todas las APIs consumidas

| Método | Ruta | Componente |
|---|---|---|
| `GET` | `/api/status` | App.tsx, ConnectionView |
| `GET` | `/api/qr` | ConnectionView |
| `POST` | `/api/disconnect` | ConnectionView |
| `POST` | `/api/send/single` | SendView |
| `POST` | `/api/upload` | SendView, MasivoSection |
| `POST` | `/api/send/bulk` | MasivoSection |
| `GET` | `/api/campaigns` | CampaignsView |
| `GET` | `/api/campaigns/:id` | CampaignsView |
| `POST` | `/api/campaigns/:id/cancel` | MasivoSection, CampaignsView |
| `DELETE` | `/api/campaigns/:id` | CampaignsView |