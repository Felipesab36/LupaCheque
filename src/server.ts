import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request } from 'express';
import {join} from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';

type Firestore = import('firebase-admin/firestore').Firestore;

type ChatContent = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

type ConversationEntry = {
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
};

type IaRuntimeSettings = {
  iaUserInstructions: string;
  iaAnalysisInstructions: string;
  iaSalesInstructions: string;
  geminiApiKey: string | null;
  geminiModel: string;
};

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const rawKey = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!rawKey || process.env[rawKey] !== undefined) {
      continue;
    }

    let value = rawValue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[rawKey] = value;
  }
}

loadEnvFile(join(process.cwd(), '.env.local'));
loadEnvFile(join(process.cwd(), '.env'));

const browserDistFolder = join(import.meta.dirname, '../browser');
const GRAPH_API_VERSION = process.env['GRAPH_API_VERSION'] || 'v21.0';
const DEFAULT_GEMINI_MODEL = process.env['GEMINI_MODEL'] || 'gemini-2.5-flash';
const DEFAULT_FIRESTORE_DATABASE_ID = 'ai-studio-ce823d18-a96a-4b7d-b709-393940c0500b';
const whatsappConversations = new Map<string, ConversationEntry[]>();
let firestoreDb: Firestore | null = null;
let firestoreInitPromise: Promise<Firestore | null> | null = null;

type RawBodyRequest = Request & { rawBody?: Buffer };

const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as RawBodyRequest).rawBody = Buffer.from(buf);
    },
  }),
);

const angularApp = new AngularNodeAppEngine();

function getSingleQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }
  return typeof value === 'string' ? value : undefined;
}

function verifyWhatsAppSignature(req: RawBodyRequest): boolean {
  const appSecret = process.env['META_APP_SECRET'];
  if (!appSecret) {
    return true;
  }

  const signatureHeader = req.header('x-hub-signature-256');
  if (!signatureHeader || !req.rawBody) {
    return false;
  }

  const [algorithm, signatureHex] = signatureHeader.split('=');
  if (algorithm !== 'sha256' || !signatureHex) {
    return false;
  }

  const expectedHex = createHmac('sha256', appSecret)
    .update(req.rawBody)
    .digest('hex');

  const signatureBuffer = Buffer.from(signatureHex, 'hex');
  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

function getFirestoreDatabaseId(): string {
  return (
    process.env['FIRESTORE_DATABASE_ID'] ||
    process.env['FIREBASE_FIRESTORE_DATABASE_ID'] ||
    DEFAULT_FIRESTORE_DATABASE_ID
  );
}

function parseServiceAccountFromEnv(): Record<string, unknown> | null {
  const jsonRaw = process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
  if (jsonRaw) {
    try {
      return JSON.parse(jsonRaw) as Record<string, unknown>;
    } catch (err) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido:', err);
    }
  }

  const b64Raw = process.env['FIREBASE_SERVICE_ACCOUNT_BASE64'];
  if (b64Raw) {
    try {
      const decoded = Buffer.from(b64Raw, 'base64').toString('utf-8');
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch (err) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 no es válido:', err);
    }
  }

  return null;
}

async function initFirestoreAdmin(): Promise<Firestore | null> {
  if (firestoreDb) {
    return firestoreDb;
  }

  if (!firestoreInitPromise) {
    firestoreInitPromise = (async () => {
      try {
        const [{ applicationDefault, cert, getApps, initializeApp }, { getFirestore }] = await Promise.all([
          import('firebase-admin/app'),
          import('firebase-admin/firestore'),
        ]);

        if (getApps().length === 0) {
          const serviceAccount = parseServiceAccountFromEnv();
          if (serviceAccount) {
            initializeApp({
              credential: cert(serviceAccount as Parameters<typeof cert>[0]),
            });
          } else {
            initializeApp({
              credential: applicationDefault(),
            });
          }
        }

        firestoreDb = getFirestore(getApps()[0], getFirestoreDatabaseId());
        return firestoreDb;
      } catch (err) {
        console.warn('Firestore admin no disponible en backend. Se usará fallback en memoria.', err);
        return null;
      } finally {
        firestoreInitPromise = null;
      }
    })();
  }

  return firestoreInitPromise;
}

async function getIaRuntimeSettings(): Promise<IaRuntimeSettings> {
  const fallback: IaRuntimeSettings = {
    iaUserInstructions: process.env['IA_USER_INSTRUCTIONS'] || '',
    iaAnalysisInstructions: process.env['IA_ANALYSIS_INSTRUCTIONS'] || '',
    iaSalesInstructions: process.env['IA_SALES_INSTRUCTIONS'] || '',
    geminiApiKey: process.env['GEMINI_API_KEY'] || null,
    geminiModel: DEFAULT_GEMINI_MODEL,
  };

  const db = await initFirestoreAdmin();
  if (!db) {
    return fallback;
  }

  try {
    const iaDoc = await db.collection('settings').doc('ia').get();
    const integrationsDoc = await db.collection('settings').doc('integrations').get();

    const iaData = (iaDoc.data()?.['data'] as Record<string, unknown> | undefined) || {};
    const integrationsData =
      (integrationsDoc.data()?.['data'] as Record<string, unknown> | undefined) || {};

    return {
      iaUserInstructions:
        typeof iaData['userInstructions'] === 'string'
          ? iaData['userInstructions']
          : fallback.iaUserInstructions,
      iaAnalysisInstructions:
        typeof iaData['analysisInstructions'] === 'string'
          ? iaData['analysisInstructions']
          : fallback.iaAnalysisInstructions,
      iaSalesInstructions:
        typeof iaData['salesInstructions'] === 'string'
          ? iaData['salesInstructions']
          : fallback.iaSalesInstructions,
      geminiApiKey:
        typeof integrationsData['geminiApiKey'] === 'string'
          ? integrationsData['geminiApiKey']
          : fallback.geminiApiKey,
      geminiModel:
        typeof integrationsData['geminiModel'] === 'string'
          ? integrationsData['geminiModel']
          : fallback.geminiModel,
    };
  } catch (err) {
    console.warn('No se pudo leer settings de IA/integraciones desde Firestore:', err);
    return fallback;
  }
}

function normalizeGeminiModel(model: string | undefined): string {
  let modelName = model || 'gemini-2.5-flash';
  const mStr = String(modelName).trim().toLowerCase();

  if (mStr.includes('gemini-2.1-flash') || mStr.includes('gemini-3.5-flash') || mStr.includes('gemini-1.5-flash')) {
    modelName = 'gemini-2.5-flash';
  } else if (mStr.includes('gemini-2.1-pro') || mStr.includes('gemini-3.1-pro') || mStr.includes('gemini-3.5-pro') || mStr.includes('gemini-1.5-pro')) {
    modelName = 'gemini-2.5-pro';
  } else if (!mStr.startsWith('gemini-')) {
    modelName = 'gemini-2.5-flash';
  }

  return modelName;
}

async function generateGeminiText(params: {
  apiKey?: string | null;
  model?: string;
  systemInstruction?: string;
  contents: ChatContent[];
}): Promise<string> {
  const finalApiKey = params.apiKey || process.env['GEMINI_API_KEY'];
  if (!finalApiKey) {
    throw new Error('Falta la API Key de Gemini. Favor configurarla en la sección de Integraciones.');
  }

  const ai = new GoogleGenAI({
    apiKey: finalApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const response = await ai.models.generateContent({
    model: normalizeGeminiModel(params.model),
    contents: params.contents,
    config: {
      systemInstruction: params.systemInstruction || '',
    },
  });

  return response.text || '';
}

function appendConversationMessage(phone: string, sender: 'user' | 'bot', text: string): void {
  const history = whatsappConversations.get(phone) || [];
  history.push({
    sender,
    text,
    timestamp: new Date().toISOString(),
  });

  // Keep a rolling context window to avoid unbounded memory growth.
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  whatsappConversations.set(phone, history);
}

function getInMemoryConversationContents(phone: string): ChatContent[] {
  const history = whatsappConversations.get(phone) || [];
  return history.map((entry) => ({
    role: entry.sender === 'user' ? 'user' : 'model',
    parts: [{ text: entry.text }],
  }));
}

async function persistConversationMessage(
  phone: string,
  sender: 'user' | 'bot',
  text: string,
): Promise<void> {
  appendConversationMessage(phone, sender, text);

  const db = await initFirestoreAdmin();
  if (!db) {
    return;
  }

  try {
    await db.collection('conversations').add({
      userPhone: phone,
      sender,
      text,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('No se pudo persistir conversación de WhatsApp en Firestore:', err);
  }
}

async function getConversationContents(phone: string): Promise<ChatContent[]> {
  const db = await initFirestoreAdmin();
  if (!db) {
    return getInMemoryConversationContents(phone);
  }

  try {
    const snapshot = await db
      .collection('conversations')
      .where('userPhone', '==', phone)
      .orderBy('timestamp', 'asc')
      .limit(40)
      .get();

    if (snapshot.empty) {
      return getInMemoryConversationContents(phone);
    }

    return snapshot.docs
      .map((docSnap) => docSnap.data())
      .filter((entry) => typeof entry['text'] === 'string')
      .map((entry) => ({
        role: entry['sender'] === 'user' ? 'user' : 'model',
        parts: [{ text: entry['text'] as string }],
      }));
  } catch (err) {
    console.warn('No se pudo leer historial de conversaciones desde Firestore:', err);
    return getInMemoryConversationContents(phone);
  }
}

function normalizePhoneVariants(phone: string): string[] {
  const base = (phone || '').trim();
  const noPlus = base.replace(/^\+/, '');
  const withPlus = noPlus ? `+${noPlus}` : '';
  return Array.from(new Set([base, withPlus, noPlus].filter(Boolean)));
}

function formatIsoDate(dateValue: unknown): string {
  if (typeof dateValue !== 'string' || !dateValue.trim()) {
    return 'N/A';
  }
  return dateValue.slice(0, 19).replace('T', ' ');
}

async function buildWhatsAppBusinessContext(phone: string): Promise<string> {
  const db = await initFirestoreAdmin();
  if (!db) {
    return '';
  }

  const phoneVariants = normalizePhoneVariants(phone);
  if (phoneVariants.length === 0) {
    return '';
  }

  try {
    let userData: Record<string, unknown> | null = null;

    for (const variant of phoneVariants) {
      const userById = await db.collection('users').doc(variant).get();
      if (userById.exists) {
        userData = userById.data() as Record<string, unknown>;
        break;
      }
    }

    if (!userData) {
      for (const variant of phoneVariants) {
        const userQuery = await db.collection('users').where('phone', '==', variant).limit(1).get();
        if (!userQuery.empty) {
          userData = userQuery.docs[0].data() as Record<string, unknown>;
          break;
        }
      }
    }

    const paymentDocs: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (const variant of phoneVariants) {
      const paymentsSnapshot = await db.collection('payments').where('userPhone', '==', variant).limit(20).get();
      paymentsSnapshot.docs.forEach((docSnap) => {
        paymentDocs.push({ id: docSnap.id, data: docSnap.data() as Record<string, unknown> });
      });
    }

    const uniquePayments = Array.from(
      new Map(paymentDocs.map((entry) => [entry.id, entry])).values(),
    )
      .sort((a, b) => {
        const aDate = typeof a.data['paymentDate'] === 'string' ? new Date(a.data['paymentDate']).getTime() : 0;
        const bDate = typeof b.data['paymentDate'] === 'string' ? new Date(b.data['paymentDate']).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 8);

    const userPhone =
      typeof userData?.['phone'] === 'string'
        ? (userData['phone'] as string)
        : phoneVariants[0];
    const userStatus =
      typeof userData?.['status'] === 'string'
        ? (userData['status'] as string)
        : 'No registrado';
    const activeSince = formatIsoDate(userData?.['activeSince']);

    const paymentsSummary =
      uniquePayments.length === 0
        ? '- No hay pagos registrados para este usuario.'
        : uniquePayments
            .map((entry) => {
              const paymentDate = formatIsoDate(entry.data['paymentDate']);
              const amount = typeof entry.data['amount'] === 'number' ? entry.data['amount'] : 0;
              const status = typeof entry.data['status'] === 'string' ? entry.data['status'] : 'N/A';
              const balance =
                typeof entry.data['currentBalance'] === 'number' ? entry.data['currentBalance'] : 0;
              return `- ${paymentDate} | monto: ${amount} | estado: ${status} | saldo: ${balance}`;
            })
            .join('\n');

    return `
# CONTEXTO OPERATIVO DEL USUARIO (WHATSAPP)
- Telefono consultado: ${userPhone}
- Estado de usuario: ${userStatus}
- Activo desde: ${activeSince}
- Cantidad de pagos recientes: ${uniquePayments.length}

# PAGOS RECIENTES
${paymentsSummary}

Usa este contexto para responder dudas de cheques/pagos con precision. Si no hay datos suficientes, indicalo claramente y solicita el dato faltante.
    `;
  } catch (err) {
    console.warn('No se pudo construir contexto de usuario/pagos para WhatsApp:', err);
    return '';
  }
}

function buildWhatsAppSystemInstruction(settings: IaRuntimeSettings): string {
  const iaUserInstructions = settings.iaUserInstructions;
  const iaAnalysisInstructions = settings.iaAnalysisInstructions;
  const iaSalesInstructions = settings.iaSalesInstructions;

  return `
# INSTRUCCIONES DE COMPORTAMIENTO GENERAL SOBRE CÓMO COMPORTARSE:
${iaUserInstructions}

# INSTRUCCIONES DE ANÁLISIS DE CONSULTAS O DATOS:
${iaAnalysisInstructions}

# INSTRUCCIONES DE MONETIZACIÓN Y VENTAS (CÓMO INTENTAR MONETIZAR):
${iaSalesInstructions}
  `;
}

async function sendWhatsAppTextMessage(to: string, text: string): Promise<void> {
  const accessToken = process.env['WHATSAPP_ACCESS_TOKEN'];
  const phoneNumberId = process.env['WHATSAPP_PHONE_NUMBER_ID'];

  if (!accessToken || !phoneNumberId) {
    throw new Error('Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID en variables de entorno.');
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Error enviando mensaje WhatsApp (${response.status}): ${details}`);
  }
}

function buildBotReply(incomingText: string): string {
  const clean = incomingText.trim();
  if (!clean) {
    return 'Recibi tu mensaje. En que te ayudo hoy?';
  }
  return `Recibi tu mensaje: "${clean}". Este es el bot base conectado a WhatsApp Cloud API.`;
}

/**
 * WhatsApp webhook verification endpoint (Meta callback).
 */
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = getSingleQueryValue(req.query['hub.mode']);
  const verifyToken = getSingleQueryValue(req.query['hub.verify_token']);
  const challenge = getSingleQueryValue(req.query['hub.challenge']);
  const expectedToken = process.env['WHATSAPP_VERIFY_TOKEN'];

  if (!expectedToken) {
    return res.status(500).send('WHATSAPP_VERIFY_TOKEN no configurado en el servidor.');
  }

  if (mode === 'subscribe' && verifyToken === expectedToken && challenge) {
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Webhook verification failed.');
});

/**
 * WhatsApp webhook receive endpoint.
 */
app.post('/api/whatsapp/webhook', async (req, res) => {
  try {
    const rawReq = req as RawBodyRequest;
    if (!verifyWhatsAppSignature(rawReq)) {
      return res.status(401).json({ error: 'Firma de webhook invalida.' });
    }

    const body = req.body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from?: string;
              type?: string;
              text?: { body?: string };
            }>;
          };
        }>;
      }>;
    };

    const messages =
      body.entry
        ?.flatMap((entry) => entry.changes ?? [])
        .flatMap((change) => change.value?.messages ?? []) ?? [];

    const iaSettings = await getIaRuntimeSettings();

    const processingTasks = messages
      .filter((msg) => msg.type === 'text' && typeof msg.from === 'string')
      .map(async (msg) => {
        const incomingText = msg.text?.body ?? '';
        const phone = msg.from as string;

        await persistConversationMessage(phone, 'user', incomingText);
        const contents = await getConversationContents(phone);
        const businessContext = await buildWhatsAppBusinessContext(phone);

        let reply = '';
        try {
          reply = await generateGeminiText({
            apiKey: iaSettings.geminiApiKey,
            model: iaSettings.geminiModel || DEFAULT_GEMINI_MODEL,
            systemInstruction: `${buildWhatsAppSystemInstruction(iaSettings)}\n${businessContext}`,
            contents,
          });
        } catch (aiErr) {
          console.error('WhatsApp AI generation error:', aiErr);
          reply = buildBotReply(incomingText);
        }

        if (!reply.trim()) {
          reply = buildBotReply(incomingText);
        }

        await persistConversationMessage(phone, 'bot', reply);
        await sendWhatsAppTextMessage(phone, reply);
      });

    await Promise.allSettled(processingTasks);
    return res.sendStatus(200);
  } catch (err: unknown) {
    console.error('WhatsApp webhook error:', err);
    const errMsg = err instanceof Error ? err.message : 'Error procesando webhook de WhatsApp.';
    return res.status(500).json({ error: errMsg });
  }
});

/**
 * Optional helper endpoint to send a message manually from your app.
 */
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, text } = req.body as { to?: string; text?: string };
    if (!to || !text) {
      return res.status(400).json({ error: 'Debes enviar "to" y "text".' });
    }

    await sendWhatsAppTextMessage(to, text);
    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    console.error('WhatsApp send error:', err);
    const errMsg = err instanceof Error ? err.message : 'Error enviando mensaje por WhatsApp.';
    return res.status(500).json({ error: errMsg });
  }
});

/**
 * Handle server-side Gemini Chat Requests
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { apiKey, model, systemInstruction, contents } = req.body;
    const text = await generateGeminiText({
      apiKey,
      model,
      systemInstruction,
      contents,
    });

    return res.json({ text });
  } catch (err: unknown) {
    console.error('Gemini endpoint error:', err);
    const errMsg = err instanceof Error ? err.message : 'Error de procesamiento en la Inteligencia Artificial.';
    return res.status(500).json({ error: errMsg });
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
