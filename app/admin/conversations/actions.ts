"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { deleteConversation } from "@/lib/chat-store";

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
