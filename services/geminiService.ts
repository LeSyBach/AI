
import { Attachment, Message } from "../types";

// HOSTING CONFIGURATION
// We use optional chaining (?.) to safely access VITE_API_URL.
// This prevents the "Cannot read properties of undefined" error if import.meta.env is not defined 
// (which can happen in some raw ES module environments or specific build setups).
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Sends a message (text + optional images) to the backend and streams the response.
 */
export const streamMessage = async (
  history: Message[],
  message: string, 
  attachments: Attachment[],
  systemInstruction: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  
  let fullText = "";

  try {
    // Prepare payload for backend
    // IMPORTANT: We remove the last message from history because 'history' param in App.tsx
    // already includes the NEW user message. But the backend needs:
    // 1. Past history (context)
    // 2. Current message (prompt)
    // Sending both causes duplication.
    const historyPayload = history.slice(0, -1).filter(m => m.content !== '' || m.generatedImage);

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: historyPayload,
        message,
        attachments,
        systemInstruction
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Backend API Error: ${response.statusText}`);
    }

    if (!response.body) throw new Error('ReadableStream not supported.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.error) throw new Error(data.error);
            if (data.text) {
              fullText += data.text;
              onChunk(data.text);
            }
          } catch (e) {
            console.warn("Error parsing stream chunk", e);
          }
        }
      }
    }

  } catch (error) {
    if (signal?.aborted) {
      return fullText;
    }
    console.error("Error streaming message:", error);
    throw error;
  }

  return fullText;
};

/**
 * Generates an image using the backend
 */
export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.imageBytes;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

// Helper to keep the existing API signature mostly compatible but unnecessary for backend logic
export const initChatSession = (systemInstruction: string = "") => {
  // This is now stateless on the frontend side, handled per request by backend.
  // We just store the instruction to pass it with every request.
  sessionStorage.setItem('bach_ai_instruction', systemInstruction);
};

export const getSystemInstruction = () => {
  return sessionStorage.getItem('bach_ai_instruction') || "";
};
