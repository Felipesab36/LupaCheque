<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ce823d18-a96a-4b7d-b709-393940c0500b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create/update [.env.local](.env.local) with your env vars:
   - `GEMINI_API_KEY`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `META_APP_SECRET`
   - `GRAPH_API_VERSION` (optional, default `v21.0`)
3. Run the app:
   `npm run dev`

## Deployment (Produccion)

Este proyecto se despliega con GitHub Actions a un servidor Linux por SSH, publicando build SSR de Angular (`browser` + `server`).

### 1. Workflow automatico

El pipeline vive en `.github/workflows/deploy-master-build.yml` y se ejecuta en cada push a `master`.

Flujo:

1. Instala dependencias y corre `npm run build`.
2. Copia `./dist/app/` al servidor con `rsync`.
3. Genera/actualiza archivo `.env` remoto desde un secret.
4. Ejecuta comando remoto de recarga/reinicio (`RELOAD_CMD`).

### 2. Secrets requeridos en GitHub

Configura estos secrets en el repositorio:

- `SSH_PRIVATE_KEY`: clave privada OpenSSH del usuario de despliegue.
- `SSH_PORT`: puerto SSH del servidor (ejemplo: `1022`).
- `DEPLOY_HOST`: host o IP del servidor.
- `DEPLOY_USER`: usuario SSH para deploy.
- `TARGET_DIR`: directorio remoto destino (ejemplo: `/var/www/lupacheque/current`).
- `RELOAD_CMD`: comando remoto para reiniciar app/proxy.
- `APP_ENV_FILE`: contenido completo del archivo `.env` de produccion.

Ejemplo de `APP_ENV_FILE`:

```env
WHATSAPP_VERIFY_TOKEN=tu_verify_token
WHATSAPP_ACCESS_TOKEN=tu_access_token
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
META_APP_SECRET=tu_meta_app_secret
GRAPH_API_VERSION=v21.0
GEMINI_API_KEY=tu_gemini_api_key
```

### 3. Servidor Linux (SSR)

Instala Node.js 20+ en el servidor.

Comandos de verificacion:

```bash
node -v
npm -v
which node
```

### 4. Servicio systemd

Crear `/etc/systemd/system/lupacheque.service`:

```ini
[Unit]
Description=LupaCheque Angular SSR
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/lupacheque/current
Environment=NODE_ENV=production
Environment=PORT=4000
ExecStart=/usr/bin/node dist/app/server/server.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Activar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable lupacheque
sudo systemctl restart lupacheque
sudo systemctl status lupacheque
```

Logs:

```bash
sudo journalctl -u lupacheque -f
```

### 5. Nginx como reverse proxy

Config base (`/etc/nginx/sites-available/lupacheque.conf`):

```nginx
server {
   listen 80;
   server_name lupacheque.educadots.com;

   location / {
      proxy_pass http://127.0.0.1:4000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
   }
}
```

Activar y recargar:

```bash
sudo ln -s /etc/nginx/sites-available/lupacheque.conf /etc/nginx/sites-enabled/lupacheque.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 6. WhatsApp webhook en produccion

Webhook URL:

`https://lupacheque.educadots.com/api/whatsapp/webhook`

Prueba de verificacion:

```bash
curl "https://lupacheque.educadots.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345"
```

Debe responder:

```text
12345
```

## Arquitectura y Tecnologias

### Frontend

- Angular 21 con TypeScript para la aplicacion principal.
- Angular Material/CDK para componentes de interfaz.
- Tailwind CSS v4 + PostCSS para estilos utilitarios y personalizacion visual.
- D3.js para visualizacion de datos y graficos.
- Motion para animaciones y transiciones.

### Backend

- Node.js + Express 5 como servidor SSR y capa API.
- Angular SSR para renderizado del lado del servidor.
- Endpoint dedicado de chat IA en `/api/chat`.

### Capa de IA

- SDK oficial `@google/genai` para integracion con modelos Gemini.
- Soporte de `GEMINI_API_KEY` desde variables de entorno o request.
- Normalizacion de nombres de modelo para compatibilidad con configuraciones heredadas.

### Capa de Datos y Autenticacion

- Firebase SDK (modular) para servicios cloud.
- Firebase Auth con inicio de sesion por Google.
- Cloud Firestore como almacenamiento principal de datos.

### Seguridad y Configuracion

- Reglas de Firestore en `firestore.rules`.
- Especificacion de seguridad en `security_spec.md`.
- Configuraciones de Firebase en `firebase-applet-config.json` y `firebase-blueprint.json`.

### Calidad y Tooling

- Angular CLI/Build 21 para build y desarrollo.
- ESLint 9 + angular-eslint + typescript-eslint para calidad de codigo.
- Soporte de pruebas con `ng test` y dependencia de Vitest.

### Flujo General

1. El usuario interactua con la app Angular en el navegador.
2. El servidor Express maneja SSR y expone endpoints API.
3. Las operaciones de negocio consultan/actualizan Firebase (Auth + Firestore).
4. Las funciones IA invocan Gemini desde el backend para mantener control de claves.
5. La UI refleja resultados, metricas y estado operativo en tiempo real.

## Integracion WhatsApp Business API (Cloud)

El servidor ya incluye endpoints base para bot en WhatsApp Cloud API:

- `GET /api/whatsapp/webhook` verificacion del webhook.
- `POST /api/whatsapp/webhook` recepcion de eventos/mensajes.
- `POST /api/whatsapp/send` envio manual de mensajes de prueba.

### Variables de entorno requeridas

- `WHATSAPP_VERIFY_TOKEN`: token para validar el webhook con Meta.
- `WHATSAPP_ACCESS_TOKEN`: token permanente de System User (o token de prueba).
- `WHATSAPP_PHONE_NUMBER_ID`: identificador del numero de WhatsApp Business.
- `META_APP_SECRET`: secreto de la app para validar `X-Hub-Signature-256`.
- `GRAPH_API_VERSION` (opcional): por defecto `v21.0`.

### Flujo de activacion rapido

1. Configura estas variables en tu entorno local/hosting.
2. Expone tu servidor por HTTPS (por ejemplo, con ngrok) para que Meta alcance el webhook.
3. En Meta Developers, registra la URL `https://TU_DOMINIO/api/whatsapp/webhook`.
4. Usa el mismo `WHATSAPP_VERIFY_TOKEN` al verificar el webhook.
5. Suscribe los eventos de mensajes del numero.
6. Envia un mensaje de prueba al numero de WhatsApp Business y revisa logs.
