# iaL - Chat IA Completo

Aplicación de chat con IA que incluye autenticación, base de datos, temas personalizados, compartir chats, adjuntar archivos y chat en tiempo real.

## Características

✅ **Autenticación** - Sistema de registro y login con JWT
✅ **Base de datos** - MongoDB para persistencia
✅ **IA real** - Integración con OpenAI API
✅ **Compartir chats** - Genera links públicos
✅ **Adjuntar archivos** - Sube imágenes y documentos
✅ **Temas personalizados** - 4 temas + personalización
✅ **Chat en tiempo real** - WebSockets para colaboración
✅ **Búsqueda** - Filtra chats por nombre
✅ **Exportar** - Descarga chats en JSON
✅ **Markdown** - Formato rico en respuestas

## Instalación

### 1. Instalar MongoDB

**Windows:**
- Descargá MongoDB Community desde: https://www.mongodb.com/try/download/community
- Instalalo y ejecutá `mongod` en una terminal

**O usa MongoDB Atlas (cloud gratis):**
- Creá cuenta en https://www.mongodb.com/cloud/atlas
- Creá un cluster gratuito
- Copiá la connection string

### 2. Instalar dependencias

```cmd
cd iaL
npm install
```

### 3. Configurar variables de entorno

Copiá `.env.example` a `.env`:

```cmd
copy .env.example .env
```

Editá `.env` con tus datos:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ial
JWT_SECRET=cambia_esto_por_algo_seguro_y_aleatorio
OPENAI_API_KEY=sk-tu-api-key-de-openai
```

**Para obtener API key de OpenAI:**
1. Andá a https://platform.openai.com/api-keys
2. Creá una cuenta
3. Generá una nueva API key
4. Pegala en `.env`

### 4. Crear carpeta uploads

```cmd
mkdir backend\uploads
```

### 5. Iniciar servidor

```cmd
npm start
```

O para desarrollo con auto-reload:

```cmd
npm run dev
```

### 6. Abrir en navegador

Andá a: http://localhost:3000

## Uso

1. **Registrate** con usuario, email y contraseña
2. **Creá un chat** con el botón +
3. **Escribí mensajes** y recibí respuestas de IA
4. **Adjuntá archivos** con el botón 📎
5. **Compartí chats** con el botón 🔗
6. **Cambiá el tema** en configuración ⚙
7. **Exportá chats** con el botón 📥

## Estructura

```
iaL/
├── frontend/           # HTML, CSS, JS del cliente
│   ├── index.html
│   ├── style.css
│   └── app.js
├── backend/            # Servidor Node.js
│   ├── server.js       # Punto de entrada
│   ├── models/         # Modelos de MongoDB
│   ├── routes/         # Endpoints API
│   ├── middleware/     # Auth middleware
│   └── uploads/        # Archivos subidos
├── package.json
├── .env.example
└── README.md
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener perfil

### Chat
- `GET /api/chat` - Listar chats
- `POST /api/chat` - Crear chat
- `GET /api/chat/:id` - Obtener chat
- `POST /api/chat/:id/message` - Agregar mensaje
- `POST /api/chat/:id/upload` - Subir archivo
- `POST /api/chat/:id/share` - Compartir chat
- `DELETE /api/chat/:id` - Eliminar chat
- `PATCH /api/chat/:id` - Actualizar título

### IA
- `POST /api/ai/generate` - Generar respuesta

### Tema
- `GET /api/theme` - Obtener tema
- `POST /api/theme` - Guardar tema

## WebSocket Events

- `join-chat` - Unirse a sala de chat
- `typing` - Usuario escribiendo
- `new-message` - Nuevo mensaje
- `message-received` - Mensaje recibido
- `user-typing` - Otro usuario escribiendo

## Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript, Socket.IO, Marked.js
- **Backend**: Node.js, Express, Socket.IO
- **Base de datos**: MongoDB, Mongoose
- **Auth**: JWT, bcrypt
- **IA**: OpenAI API
- **Upload**: Multer

## Próximas mejoras

- [ ] Modo offline con Service Workers
- [ ] Notificaciones push
- [ ] Búsqueda en mensajes
- [ ] Editar/eliminar mensajes
- [ ] Reacciones a mensajes
- [ ] Modo voz (speech-to-text)
- [ ] Múltiples modelos de IA
- [ ] Carpetas para organizar chats
- [ ] Estadísticas de uso

## Troubleshooting

**Error: MongoDB no conecta**
- Verificá que MongoDB esté corriendo
- Chequeá la URI en `.env`

**Error: OpenAI API**
- Verificá que la API key sea válida
- Chequeá que tengas créditos en tu cuenta

**Error: Puerto en uso**
- Cambiá el PORT en `.env`

**Archivos no se suben**
- Verificá que exista la carpeta `backend/uploads`
- Chequeá permisos de escritura

## Licencia

MIT

## Autor

Creado con ❤️ para iaL
