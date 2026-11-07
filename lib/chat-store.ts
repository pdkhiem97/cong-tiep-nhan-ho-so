import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Hội thoại của khách là dữ liệu riêng tư. Hai bảng bật RLS và không có policy,
// nên chỉ secret key dùng ở server mới truy cập được. "server-only" làm build lỗi
// nếu file này bị import vào code chạy trên trình duyệt.

export interface StoredMessage {
  id: number;
  from: "bot" | "user";
  text: string;
}

interface MessageRow {
  id: number;
  sender: StoredMessage["from"];
  content: string;
}

const CONVERSATION_COOKIE = "duhoc24_chat_id";
const CONVERSATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày, tính lại sau mỗi tin nhắn
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let client: SupabaseClient | undefined;

function getClient() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secretKey) {
      throw new Error("Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY");
    }
    client = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

// Mã hội thoại chỉ đọc từ cookie httpOnly do server cấp, không nhận từ nội dung request.
export async function readConversationId() {
  const cookieStore = await cookies();
  const value = cookieStore.get(CONVERSATION_COOKIE)?.value;
  return value && UUID_PATTERN.test(value) ? value : null;
}

// Trả về hội thoại của khách hiện tại, tạo mới nếu chưa có, và gia hạn cookie.
export async function ensureConversationId() {
  const existing = await readConversationId();
  const conversationId =
    existing && (await conversationExists(existing)) ? existing : await createConversation();

  const cookieStore = await cookies();
  cookieStore.set(CONVERSATION_COOKIE, conversationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/chat",
    maxAge: CONVERSATION_COOKIE_MAX_AGE,
  });
  return conversationId;
}

async function conversationExists(conversationId: string) {
  const { data, error } = await getClient()
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

async function createConversation() {
  const { data, error } = await getClient()
    .from("conversations")
    .insert({})
    .select("id")
    .single<{ id: string }>();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function addMessage(
  conversationId: string,
  from: StoredMessage["from"],
  text: string,
) {
  const { error } = await getClient()
    .from("messages")
    .insert({ conversation_id: conversationId, sender: from, content: text });
  if (error) throw new Error(error.message);
}

export async function getMessages(conversationId: string): Promise<StoredMessage[]> {
  const { data, error } = await getClient()
    .from("messages")
    .select("id, sender, content")
    .eq("conversation_id", conversationId)
    .order("id", { ascending: true })
    .returns<MessageRow[]>();
  if (error) throw new Error(error.message);
  return data.map((row) => ({ id: row.id, from: row.sender, text: row.content }));
}
