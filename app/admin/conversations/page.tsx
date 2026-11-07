import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { ADMIN_CONVERSATIONS_PAGE_SIZE, listConversations } from "@/lib/chat-store";
import { formatDateTime } from "./format";

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  // Kiểm tra lần nữa ngoài proxy.ts, vì trang này đọc dữ liệu thật của khách.
  if (!isAdminAuthorized((await headers()).get("authorization"))) notFound();

  const { page: pageParam } = await searchParams;
  const parsedPage = typeof pageParam === "string" ? Number.parseInt(pageParam, 10) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { conversations, total } = await listConversations(page);
  const hasNextPage = total !== null && page * ADMIN_CONVERSATIONS_PAGE_SIZE < total;

  return (
    <>
      <AdminPageHeader
        title="Hội thoại"
        description={`Lịch sử hội thoại của khách với chatbot hỏi đáp trên trang chủ${
          total !== null ? ` (${total} cuộc trò chuyện)` : ""
        }.`}
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tin nhắn đầu tiên</TableHead>
              <TableHead>Số tin nhắn</TableHead>
              <TableHead>Thời gian bắt đầu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell className="max-w-md truncate font-medium">
                  <Link href={`/admin/conversations/${conv.id}`} className="hover:underline">
                    {conv.firstMessage ?? "(Chưa có tin nhắn)"}
                  </Link>
                </TableCell>
                <TableCell>{conv.messageCount} tin nhắn</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(conv.createdAt)}
                </TableCell>
              </TableRow>
            ))}
            {conversations.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                  {page > 1 ? "Trang này không có cuộc trò chuyện nào." : "Chưa có cuộc trò chuyện nào."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {(page > 1 || hasNextPage) && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Trang {page}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/conversations?page=${page - 1}`} />}
                nativeButton={false}
              >
                Trang trước
              </Button>
            )}
            {hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/conversations?page=${page + 1}`} />}
                nativeButton={false}
              >
                Trang sau
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
