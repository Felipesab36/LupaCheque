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
