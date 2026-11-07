import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getConversationDetail } from "@/lib/chat-store";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../format";

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Kiểm tra lần nữa ngoài proxy.ts, vì trang này đọc dữ liệu thật của khách.
  if (!isAdminAuthorized((await headers()).get("authorization"))) notFound();

  const { id } = await params;
  const conversation = await getConversationDetail(id);
  if (!conversation) notFound();

  return (
    <>
      <Link
        href="/admin/conversations"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tất cả hội thoại
      </Link>

      <AdminPageHeader
        title="Chi tiết hội thoại"
        description={`Bắt đầu lúc ${formatDateTime(conversation.createdAt)}, ${conversation.messages.length} tin nhắn.`}
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          {conversation.messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex flex-col gap-1", m.from === "user" ? "items-end" : "items-start")}
            >
              <span className="text-xs text-muted-foreground">
                {m.from === "user" ? "Khách" : "Chatbot"} · {formatDateTime(m.createdAt)}
              </span>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                  m.from === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {conversation.messages.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Cuộc trò chuyện này chưa có tin nhắn.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
