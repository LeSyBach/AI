import { Attachment, Message } from "../types";

// API URL pointing to Node.js backend (via Vite proxy in dev, or relative path in prod)
const API_URL = '/api';

export const initChatSession = (systemInstruction: string = "") => {
  sessionStorage.setItem('bach_ai_instruction', systemInstruction);
};

export const getSystemInstruction = () => {
  return sessionStorage.getItem('bach_ai_instruction') || "";
};

export const streamMessage = async (
  history: Message[],
  message: string, 
  attachments: Attachment[],
  systemInstruction: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<string> => {
  
  // 1. Prepare Payload for Node.js Backend
  // FIX: Send raw history objects instead of pre-formatting them. 
  // The backend expects objects with { role, content, attachments, etc. }
  const rawHistory = history.slice(0, -1).map(msg => ({
    role: msg.role,
    content: msg.content,
    attachments: msg.attachments,
    generatedImage: msg.generatedImage
  }));

  const payload = {
    message: message,
    attachments: attachments,
    history: rawHistory,
    systemInstruction: systemInstruction
  };

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        // Try to parse JSON error if possible
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || errorText);
        } catch {
            throw new Error(`Server Error (${response.status}): ${errorText}`);
        }
    }

    if (!response.body) throw new Error("No response body");

    // 2. Handle SSE Stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith("data: ")) continue;
        
        const dataStr = trimmedLine.substring(6);
        if (dataStr === "[DONE]") continue;

        try {
            const data = JSON.parse(dataStr);
            if (data.text !== undefined) {
                onChunk(data.text);
            } else if (data.error) {
                throw new Error(data.error);
            }
        } catch (e) {
            // Ignore JSON parse errors for partial chunks or logging
            console.warn("Parse error for chunk:", dataStr);
        }
      }
    }

  } catch (error: any) {
    if (signal?.aborted) return "";
    console.error("Stream Error:", error);
    throw error;
  }

  return "";
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        const errText = await response.text();
        try {
             const errJson = JSON.parse(errText);
             throw new Error(errJson.error || errText);
        } catch {
             throw new Error(`Failed: ${errText}`);
        }
    }

    const data = await response.json();
    return data.imageBytes;
    
  } catch (error: any) {
    console.error("Image Gen Error:", error);
    throw new Error(error.message || "Failed to generate image");
  }
};