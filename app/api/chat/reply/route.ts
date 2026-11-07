import { generateReply } from "@/lib/chat-gemini";
import { addMessage, getMessages, readConversationId } from "@/lib/chat-store";

// Tạo câu trả lời cho câu hỏi mới nhất đã lưu trong hội thoại của khách.
export async function POST() {
  const conversationId = await readConversationId();
  if (!conversationId) {
    return Response.json({ error: "Không tìm thấy hội thoại." }, { status: 404 });
  }

  try {
    const messages = await getMessages(conversationId);
    // Chỉ gọi Gemini khi có câu hỏi chưa được trả lời, tránh tốn hạn mức khi bị gọi lặp.
    if (messages.at(-1)?.from !== "user") return Response.json({ messages });

    const reply = await generateReply(messages);
    await addMessage(conversationId, "bot", reply);
    return Response.json({ messages: await getMessages(conversationId) });
  } catch (error) {
    console.error("Chat API: không tạo được câu trả lời:", error);
    return Response.json({ error: "Không nhận được câu trả lời." }, { status: 502 });
  }
}
