import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'AquaLink API' });
  });

  // Server-side Gemini API proxy route for AquaBot
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history = [], userRole, bookings = [], complaints = [] } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `
You are AquaBot, the official AI assistant for AquaLink - Mira-Bhayandar's Smart Water Management Platform.

PLATFORM INFO:
- Service Area: Mira-Bhayandar (Shanti Nagar, Mira Road East, Bhayandar West, Kashimira, Beverly Park, Poonam Sagar).
- Pricing: 1000L (₹500), 2000L (₹900), 5000L (₹2000), 10000L (₹3800).
- NEW: Priority Express Dispatch (+25% surcharge) for guaranteed emergency delivery within 2 hours.
- Features: Real-time Leaflet GPS fleet tracking, automated scheduling, Push Notifications, Dark Mode, Digital Invoices, Support Ticketing.
- Helpline: 1800-123-4567 (Available 24/7).
- Operational Hours: 24/7 Water Delivery.

USER CONTEXT:
- Current Role: ${userRole || 'Resident'}
- Recent Bookings: ${JSON.stringify(bookings.slice(0, 3))}
- Recent Complaints: ${JSON.stringify(complaints.slice(0, 3))}

YOUR CAPABILITIES:
1. GUIDANCE: Help users navigate the dashboard.
2. TRACKING: If a user asks "Where is my tanker?", check their bookings and provide the status (Pending, Confirmed, En Route, Delivered) and ETA.
3. BOOKING: Explain how to book. Recommend "Priority Dispatch" for emergencies.
4. SUPPORT: Help with filing complaints or checking status of CMP-XXXX IDs.
5. VENDOR HELP: If role is 'admin' or 'society', explain analytics, fleet tracking map, and master records.
6. EMERGENCY: If a user mentions a water crisis or emergency, advise them to use the "Request Priority Dispatch" button for guaranteed fast delivery.

STRICT RULES:
- Be professional, empathetic, friendly, and concise.
- Use Markdown for bolding, lists, and tables.
- If you don't know something, refer them to the 24/7 Helpline: 1800-123-4567.
- Do not hallucinate booking IDs; only use what's in the context.
`;

      const contents = [
        ...history.slice(1).map((m: any) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.text || '' }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ];

      // Models to try with fallback
      const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let botResponse = '';
      let lastError: any = null;

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            }
          });

          if (response && response.text) {
            botResponse = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${model} failed, trying next model:`, err.message || err);
        }
      }

      if (!botResponse) {
        throw lastError || new Error('No response from Gemini API');
      }

      return res.json({ reply: botResponse });
    } catch (error: any) {
      console.error('Chat endpoint error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AquaLink server running on http://0.0.0.0:${port}`);
  });
}

startServer();
