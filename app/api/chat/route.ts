import {
  addMessage,
  ensureConversationId,
  getMessages,
  readConversationId,
} from "@/lib/chat-store";

const MAX_MESSAGE_LENGTH = 1000;

// Lấy hội thoại của khách hiện tại từ database.
export async function GET() {
  const conversationId = await readConversationId();
  if (!conversationId) return Response.json({ messages: [] });

  try {
    return Response.json({ messages: await getMessages(conversationId) });
  } catch (error) {
    console.error("Chat API: không đọc được hội thoại:", error);
    return Response.json({ error: "Không tải được hội thoại." }, { status: 500 });
  }
}

// Lưu câu hỏi và cấp cookie ngay, chưa gọi Gemini. Nhờ vậy khách đóng tab hay tải lại trang
// trong lúc bot đang trả lời thì vẫn tìm lại được hội thoại. Câu trả lời do /api/chat/reply tạo.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: "Tin nhắn không hợp lệ." }, { status: 400 });
  }

  try {
    const conversationId = await ensureConversationId();
    await addMessage(conversationId, "user", text);
    return Response.json({ messages: await getMessages(conversationId) });
  } catch (error) {
    console.error("Chat API: không lưu được tin nhắn:", error);
    return Response.json({ error: "Không lưu được tin nhắn." }, { status: 500 });
  }
}
