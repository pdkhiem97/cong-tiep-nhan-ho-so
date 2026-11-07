"use client";

import React from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Trash2 } from "lucide-react";
import { deleteConversationAction } from "@/app/admin/conversations/actions";
import { Button } from "@/components/ui/button";

export function DeleteConversationButton({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function confirmDelete() {
    setErrorText(null);
    startTransition(async () => {
      try {
        const result = await deleteConversationAction(conversationId);
        if (result?.error) setErrorText(result.error);
      } catch (error) {
        console.error(error);
        setErrorText("Chưa xoá được cuộc trò chuyện. Bạn vui lòng thử lại.");
      }
    });
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        setOpen(nextOpen);
        setErrorText(null);
      }}
    >
      <AlertDialog.Trigger render={<Button variant="destructive" size="sm" className="text-white" />}>
        <Trash2 className="size-4" />
        Xoá cuộc trò chuyện
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 text-card-foreground shadow-xl ring-1 ring-foreground/6.5">
          <AlertDialog.Title className="text-lg font-medium">
            Xoá cuộc trò chuyện này?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            Toàn bộ tin nhắn trong cuộc trò chuyện sẽ bị xoá vĩnh viễn và không khôi phục được.
            Khách cũng sẽ không còn thấy lịch sử này trong khung chat.
          </AlertDialog.Description>
          {errorText && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {errorText}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Close
              disabled={pending}
              render={<Button variant="outline" size="sm" />}
            >
              Huỷ
            </AlertDialog.Close>
            <Button
              variant="destructive"
              size="sm"
              className="text-white"
              disabled={pending}
              onClick={confirmDelete}
            >
              {pending ? "Đang xoá..." : "Xoá vĩnh viễn"}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
