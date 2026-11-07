import { formatDateTime } from "@/app/admin/conversations/format";
import { ExtractLeadButton } from "@/components/admin/extract-lead-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Lead } from "@/lib/chat-store";

const qualityLabels = {
  good: { label: "Tốt (good)", variant: "default" },
  ok: { label: "Ổn (ok)", variant: "secondary" },
  spam: { label: "Spam", variant: "destructive" },
} as const;

function consultationLabel(value: boolean | null) {
  if (value === null) return null;
  return value ? "Có" : "Không";
}

export function LeadPanel({
  conversationId,
  lead,
  lastMessageAt,
}: {
  conversationId: string;
  lead: Lead | null;
  lastMessageAt: string | null;
}) {
  const fields = lead && [
    { label: "Tên", value: lead.name },
    { label: "Email", value: lead.email },
    { label: "Số điện thoại", value: lead.phone },
    { label: "Nước du học", value: lead.country },
    { label: "Bậc học", value: lead.studyLevel },
    { label: "Ngành", value: lead.major },
    { label: "Thời gian rảnh", value: lead.availability },
    { label: "Đặt lịch tư vấn", value: consultationLabel(lead.wantsConsultation) },
  ];
  const quality = lead && qualityLabels[lead.quality];
  const outdated =
    lead && lastMessageAt && new Date(lastMessageAt) > new Date(lead.extractedAt);

  return (
    <Card className="mb-6">
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-medium">Thông tin lead</h2>
              {quality && <Badge variant={quality.variant}>{quality.label}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {lead
                ? `Do AI trích xuất lúc ${formatDateTime(lead.extractedAt)}, nên đối chiếu với tin nhắn bên dưới.`
                : "Chưa trích xuất. Bấm nút để AI đọc cuộc trò chuyện và điền thông tin."}
            </p>
            {outdated && (
              <p className="mt-1 text-sm font-medium">
                Khách có tin nhắn mới sau lần trích xuất này.
              </p>
            )}
          </div>
          <ExtractLeadButton conversationId={conversationId} hasLead={lead !== null} />
        </div>

        {fields && (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {fields.map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words font-medium">{value ?? "—"}</dd>
              </div>
            ))}
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-muted-foreground">Ghi chú</dt>
              <dd className="whitespace-pre-wrap break-words font-medium">{lead.note ?? "—"}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
