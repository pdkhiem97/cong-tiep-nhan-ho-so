import "server-only";
import { GoogleGenAI } from "@google/genai";
import { chatSystemInstruction } from "@/lib/chat-prompt";
import type { StoredMessage } from "@/lib/chat-store";

const MODEL = "gemini-3.5-flash-lite";
const MAX_HISTORY_MESSAGES = 20;
const REQUEST_TIMEOUT_MS = 20_000;

export async function generateReply(messages: StoredMessage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Thiếu GEMINI_API_KEY");

  // Gemini yêu cầu lịch sử bắt đầu bằng tin của khách.
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  const history = recent.slice(recent.findIndex((m) => m.from === "user"));

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { timeout: REQUEST_TIMEOUT_MS },
  });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: history.map((m) => ({
      role: m.from === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    })),
    config: {
      systemInstruction: chatSystemInstruction,
      temperature: 0,
    },
  });

  const reply = response.text?.trim();
  if (!reply) {
    throw new Error(`Gemini không trả về nội dung (${response.candidates?.[0]?.finishReason})`);
  }
  return reply;
}
