"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { extractLeadAction } from "@/app/admin/conversations/actions";
import { Button } from "@/components/ui/button";

export function ExtractLeadButton({
  conversationId,
  hasLead,
}: {
  conversationId: string;
  hasLead: boolean;
}) {
  const [errorText, setErrorText] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function extract() {
    setErrorText(null);
    startTransition(async () => {
      try {
        const result = await extractLeadAction(conversationId);
        if (result.error) setErrorText(result.error);
      } catch (error) {
        console.error(error);
        setErrorText("Chưa trích xuất được lead. Bạn vui lòng thử lại sau ít phút.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button variant="outline" size="sm" disabled={pending} onClick={extract}>
        <Sparkles className="size-4" />
        {pending ? "Đang trích xuất..." : hasLead ? "Trích xuất lại" : "Trích xuất lead"}
      </Button>
      {errorText && (
        <p role="alert" className="text-sm text-destructive">
          {errorText}
        </p>
      )}
    </div>
  );
}
