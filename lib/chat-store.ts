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

// Các hàm dưới đây chỉ dành cho trang quản trị: đọc được hội thoại của mọi khách.

export const ADMIN_CONVERSATIONS_PAGE_SIZE = 50;

export interface ConversationSummary {
  id: string;
  createdAt: string;
  messageCount: number;
  firstMessage: string | null;
}

export interface ConversationDetail {
  id: string;
  createdAt: string;
  messages: (StoredMessage & { createdAt: string })[];
}

interface ConversationSummaryRow {
  id: string;
  created_at: string;
  messages: { count: number }[];
  first_message: { content: string }[];
}

interface ConversationDetailRow {
  id: string;
  created_at: string;
  messages: (MessageRow & { created_at: string })[];
}

export async function listConversations(page: number) {
  const from = (page - 1) * ADMIN_CONVERSATIONS_PAGE_SIZE;
  const { data, error, count } = await getClient()
    .from("conversations")
    .select("id, created_at, messages(count), first_message:messages(content)", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .order("id", { referencedTable: "first_message", ascending: true })
    .limit(1, { referencedTable: "first_message" })
    .range(from, from + ADMIN_CONVERSATIONS_PAGE_SIZE - 1)
    .returns<ConversationSummaryRow[]>();

  // PGRST103: số trang vượt quá dữ liệu hiện có.
  if (error?.code === "PGRST103") return { conversations: [], total: null };
  if (error) throw new Error(error.message);

  const conversations: ConversationSummary[] = data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    messageCount: row.messages[0]?.count ?? 0,
    firstMessage: row.first_message[0]?.content ?? null,
  }));
  return { conversations, total: count };
}

// Xoá hội thoại và toàn bộ tin nhắn của nó (khoá ngoại on delete cascade). Không khôi phục được.
export async function deleteConversation(id: string) {
  if (!UUID_PATTERN.test(id)) return;

  const { error } = await getClient().from("conversations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getConversationDetail(id: string): Promise<ConversationDetail | null> {
  if (!UUID_PATTERN.test(id)) return null;

  const { data, error } = await getClient()
    .from("conversations")
    .select("id, created_at, messages(id, sender, content, created_at)")
    .eq("id", id)
    .order("id", { referencedTable: "messages", ascending: true })
    .returns<ConversationDetailRow[]>()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as ConversationDetailRow;
  return {
    id: row.id,
    createdAt: row.created_at,
    messages: row.messages.map((m) => ({
      id: m.id,
      from: m.sender,
      text: m.content,
      createdAt: m.created_at,
    })),
  };
}
