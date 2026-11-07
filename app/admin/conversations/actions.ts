"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { deleteConversation, getConversationDetail, saveLead } from "@/lib/chat-store";
import { extractLead } from "@/lib/lead-extraction";

export async function extractLeadAction(id: string) {
  // Server Action gọi được bằng POST trực tiếp, nên phải tự kiểm tra quyền ở đây.
  if (!isAdminAuthorized((await headers()).get("authorization"))) {
    return { error: "Bạn không có quyền trích xuất lead." };
  }

  try {
    const conversation = await getConversationDetail(String(id));
    if (!conversation) return { error: "Không tìm thấy cuộc trò chuyện này." };
    if (!conversation.messages.some((m) => m.from === "user")) {
      return { error: "Khách chưa nhắn tin nên chưa có gì để trích xuất." };
    }

    await saveLead(conversation.id, await extractLead(conversation.messages));
    revalidatePath(`/admin/conversations/${conversation.id}`);
    return {};
  } catch (error) {
    console.error("Admin: không trích xuất được lead:", error);
    return { error: "Chưa trích xuất được lead. Bạn vui lòng thử lại sau ít phút." };
  }
}

export async function deleteConversationAction(id: string) {
  // Server Action gọi được bằng POST trực tiếp, nên phải tự kiểm tra quyền ở đây.
  if (!isAdminAuthorized((await headers()).get("authorization"))) {
    return { error: "Bạn không có quyền xoá cuộc trò chuyện này." };
  }

  try {
    await deleteConversation(String(id));
  } catch (error) {
    console.error("Admin: không xoá được hội thoại:", error);
    return { error: "Chưa xoá được cuộc trò chuyện. Bạn vui lòng thử lại." };
  }

  revalidatePath("/admin/conversations");
  redirect("/admin/conversations");
}
