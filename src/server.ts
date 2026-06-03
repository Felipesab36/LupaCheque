import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { GoogleGenAI } from '@google/genai';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());

const angularApp = new AngularNodeAppEngine();

/**
 * Handle server-side Gemini Chat Requests
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { apiKey, model, systemInstruction, contents } = req.body;
    const finalApiKey = apiKey || process.env['GEMINI_API_KEY'];
    if (!finalApiKey) {
      return res.status(400).json({ error: 'Falta la API Key de Gemini. Favor configurarla en la sección de Integraciones.' });
    }

    const ai = new GoogleGenAI({
      apiKey: finalApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Normalize model names to prevent 404s for old legacy parameters stored in DB
    let modelName = model || 'gemini-2.5-flash';
    const mStr = String(modelName).trim().toLowerCase();
    if (mStr.includes('gemini-2.1-flash') || mStr.includes('gemini-3.5-flash') || mStr.includes('gemini-1.5-flash')) {
      modelName = 'gemini-2.5-flash';
    } else if (mStr.includes('gemini-2.1-pro') || mStr.includes('gemini-3.1-pro') || mStr.includes('gemini-3.5-pro') || mStr.includes('gemini-1.5-pro')) {
      modelName = 'gemini-2.5-pro';
    } else if (!mStr.startsWith('gemini-')) {
      modelName = 'gemini-2.5-flash';
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction || ''
      }
    });

    return res.json({ text: response.text || '' });
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
