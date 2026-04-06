# WA BULK — Frontend

App React + TypeScript para envío masivo de WhatsApp.

## Inicio rápido

```bash
npm install
npm run dev
# → http://localhost:5173
```

> El backend debe estar corriendo en `http://localhost:3000`

---

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Framer Motion
- Socket.IO Client
- Lucide React

---

## Componentes

### `App.tsx`
Layout principal. Maneja el sidebar, la navegación entre vistas, el socket global y los toasts.

### `ConnectionView`
Vincula el número WhatsApp escaneando un QR. Muestra el estado de conexión en tiempo real y permite cerrar sesión.

### `SendView`
Envío individual. Soporta texto, imagen y documento. El archivo se sube con barra de progreso real antes de enviar.

### `MasivoSection`
Envío masivo con campaña. Los contactos se cargan como JSON. Mientras corre la campaña, el panel derecho muestra el progreso en tiempo real (%) y el log de eventos por Socket.IO. El botón "Iniciar campaña" se convierte en "Cancelar campaña" mientras está activa.

### `CampaignsView`
Historial de campañas con métricas globales, filtros y búsqueda. Al hacer click en una card se abre un drawer con el detalle completo de mensajes, y opciones para cancelar o eliminar.

---

## APIs

| Método | Ruta | Usado en |
|---|---|---|
| `GET` | `/api/status` | App, Conexión |
| `GET` | `/api/qr` | Conexión |
| `POST` | `/api/disconnect` | Conexión |
| `POST` | `/api/send/single` | Enviar |
| `POST` | `/api/upload` | Enviar, Masivo |
| `POST` | `/api/send/bulk` | Masivo |
| `GET` | `/api/campaigns` | Campañas |
| `GET` | `/api/campaigns/:id` | Campañas |
| `POST` | `/api/campaigns/:id/cancel` | Masivo, Campañas |
| `DELETE` | `/api/campaigns/:id` | Campañas |

---

## Formato JSON (Masivo)

```json
[
  { "phone": "51987654321", "text": "Hola {nombre}!", "nombre": "Juan" },
  { "phone": "51912345678", "text": "Hola {nombre}!", "nombre": "María" }
]
```

Variables disponibles: `{nombre}`, `{phone}`