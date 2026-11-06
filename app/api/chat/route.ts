import { GoogleGenAI } from "@google/genai";
import { chatSystemInstruction } from "@/lib/chat-qna";

const MODEL = "gemini-3.5-flash-lite";
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 20_000;

interface ChatTurn {
  from: "bot" | "user";
  text: string;
}

function isChatTurn(value: unknown): value is ChatTurn {
  if (typeof value !== "object" || value === null) return false;
  const { from, text } = value as Record<string, unknown>;
  return (
    (from === "bot" || from === "user") &&
    typeof text === "string" &&
    text.trim().length > 0 &&
    text.length <= MAX_MESSAGE_LENGTH
  );
}

// Trả về lịch sử hợp lệ, bắt đầu bằng tin của khách và kết thúc bằng câu hỏi mới nhất.
function parseHistory(body: unknown): ChatTurn[] | null {
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages)) return null;

  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  if (!recent.every(isChatTurn)) return null;
  if (recent.at(-1)?.from !== "user") return null;

  return recent.slice(recent.findIndex((m) => m.from === "user"));
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const history = parseHistory(body);
  if (!history) {
    return Response.json({ error: "Tin nhắn không hợp lệ." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Chat API: thiếu GEMINI_API_KEY");
    return Response.json({ error: "Chatbot chưa được cấu hình." }, { status: 500 });
  }

  try {
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
      console.error("Chat API: Gemini không trả về nội dung", response.candidates?.[0]?.finishReason);
      return Response.json({ error: "Không nhận được câu trả lời." }, { status: 502 });
    }
    return Response.json({ reply });
  } catch (error) {
    console.error("Chat API: lỗi khi gọi Gemini:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Không thể kết nối tới chatbot." }, { status: 502 });
  }
}
