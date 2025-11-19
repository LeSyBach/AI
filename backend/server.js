import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from the root directory (one level up from backend/)
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();

// HOSTING CONFIG: Use the port assigned by the hosting provider (process.env.PORT)
// If running locally, fallback to 5000.
const port = process.env.PORT || 5000; 

// Middleware
app.use(cors({
  origin: '*', // In production, you might want to restrict this to your Frontend domain
  methods: ['GET', 'POST']
}));
app.use(express.json({ limit: '50mb' }));

// Check API Key with clear error message
if (!process.env.API_KEY) {
  console.error("\x1b[31m%s\x1b[0m", "❌ ERROR: API_KEY is missing.");
  console.error("👉 Please create a '.env' file in the root folder with: API_KEY=your_key_here");
  process.exit(1);
}

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'imagen-4.0-generate-001';

// Health Check Route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>BACH AI Backend</title>
      <style>
        body { font-family: sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .box { text-align: center; padding: 40px; background: #1e293b; border-radius: 12px; }
        .green { color: #22c55e; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>🚀 Backend is Running!</h1>
        <p>Status: <span class="green">Online</span></p>
        <p>Port: ${port}</p>
      </div>
    </body>
    </html>
  `);
});

// Streaming Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, attachments, history, systemInstruction } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const validHistory = history.map(msg => {
      const parts = [];
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
        });
      }
      if (msg.generatedImage) {
        parts.push({ text: "[Image Generated]" });
      }
      if (msg.content && msg.content.trim() !== "") {
        parts.push({ text: msg.content });
      } else if (parts.length === 0) {
        parts.push({ text: "..." }); 
      }
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts
      };
    });

    const chat = ai.chats.create({
      model: TEXT_MODEL,
      history: validHistory,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    const currentParts = [];
    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        currentParts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }
    if (message) {
      currentParts.push({ text: message });
    }

    const result = await chat.sendMessageStream({ 
      message: currentParts 
    });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || "Internal Server Error" })}\n\n`);
    res.end();
  }
});

// Image Generation Endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log(`Generating image for prompt: ${prompt}`);

    const response = await ai.models.generateImages({
      model: IMAGE_MODEL,
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      res.json({ imageBytes: response.generatedImages[0].image.imageBytes });
    } else {
      throw new Error('No image generated');
    }

  } catch (error) {
    console.error('Error in /api/generate-image:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`\n✅ BACH AI Backend is listening on port ${port}`);
});