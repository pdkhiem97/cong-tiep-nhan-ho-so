"use client";

import React from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  from: "bot" | "user";
  text: string;
}

// Tin đã lưu trong database, do /api/chat trả về.
interface StoredMessage extends Message {
  id: number;
}

interface ChatResponse {
  messages?: StoredMessage[];
  error?: string;
}

const quickQuestions = [
  "Dịch vụ này gồm những gì?",
  "Mất bao lâu để có kết quả?",
  "Chi phí dịch vụ là bao nhiêu?",
  "Cần chuẩn bị giấy tờ gì?",
];

// Lời chào chỉ để hiển thị, không lưu vào database.
const greeting: Message = {
  from: "bot",
  text: "Chào bạn! Mình là trợ lý ảo của DuHoc24, bạn cần hỗ trợ gì về hồ sơ du học?",
};

const loadErrorText = "Xin lỗi, mình chưa tải được cuộc trò chuyện trước đó.";
const sendErrorText = "Xin lỗi, mình chưa trả lời được lúc này. Bạn vui lòng thử lại sau ít phút nhé.";

async function postChat(url: string, body?: { text: string }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${url} trả về ${res.status}`);
  const data: ChatResponse = await res.json();
  return data.messages ?? [];
}

export function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<StoredMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  // Câu hỏi đang gửi, chỉ hiện tạm cho đến khi server trả về danh sách tin từ database.
  const [pendingText, setPendingText] = React.useState<string | null>(null);
  const [replying, setReplying] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const busy = loading || pendingText !== null || replying;

  React.useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      try {
        const res = await fetch("/api/chat", { cache: "no-store" });
        if (!res.ok) throw new Error(`Chat API trả về ${res.status}`);
        const data: ChatResponse = await res.json();
        if (!cancelled) setMessages(data.messages ?? []);
      } catch (error) {
        console.error(error);
        if (!cancelled) setErrorText(loadErrorText);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pendingText, errorText, open, loading]);

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || busy) return;

    setInput("");
    setErrorText(null);
    setPendingText(text);

    let saved = false;
    try {
      setMessages(await postChat("/api/chat", { text }));
      saved = true;
      setPendingText(null);
      setReplying(true);
      setMessages(await postChat("/api/chat/reply"));
    } catch (error) {
      console.error(error);
      setErrorText(sendErrorText);
      // Câu hỏi chưa lưu được thì trả lại ô nhập để khách khỏi phải gõ lại.
      if (!saved) setInput(text);
    } finally {
      setPendingText(null);
      setReplying(false);
    }
  }

  const visibleMessages: (Message & { key: string | number })[] = [
    { ...greeting, key: "greeting" },
    ...messages.map((m) => ({ ...m, key: m.id })),
    ...(pendingText ? [{ from: "user" as const, text: pendingText, key: "pending" }] : []),
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border bg-card shadow-xl shadow-black/10 ring-1 ring-foreground/6.5 sm:w-96">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <p className="text-sm font-medium">Hỏi đáp nhanh</p>
              <p className="text-xs opacity-80">Trợ lý tư vấn du học</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Đóng khung chat"
              className="flex size-7 items-center justify-center rounded-full hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {visibleMessages.map((m) => (
              <div
                key={m.key}
                className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                    m.from === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                  {loading ? "Đang tải cuộc trò chuyện..." : "Đang trả lời..."}
                </div>
              </div>
            )}
            {errorText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-foreground">
                  {errorText}
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <div className="flex flex-wrap gap-1.5 pb-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={busy}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground duration-150 hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1000}
                placeholder="Nhập câu hỏi của bạn..."
                className="h-9 flex-1 rounded-full border border-input bg-transparent px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="icon" className="shrink-0" aria-label="Gửi" disabled={busy}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng khung chat" : "Mở khung chat hỏi đáp"}
        className="ml-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 duration-150 hover:brightness-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
