import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";

// Mục Hội thoại chứa dữ liệu thật của khách nên phải nhập mật khẩu mới xem được.
export function proxy(request: NextRequest) {
  if (isAdminAuthorized(request.headers.get("authorization"))) {
    return NextResponse.next();
  }

  // Link trong sidebar tự prefetch trang này bằng fetch. Chỉ gửi WWW-Authenticate khi người dùng
  // thật sự mở trang, nếu không trình duyệt sẽ hỏi mật khẩu cả khi họ đang ở mục admin khác.
  const fetchMode = request.headers.get("sec-fetch-mode");
  const headers: HeadersInit =
    fetchMode && fetchMode !== "navigate"
      ? {}
      : { "WWW-Authenticate": 'Basic realm="DuHoc24 Admin", charset="UTF-8"' };

  return new NextResponse("Cần đăng nhập để xem hội thoại.", { status: 401, headers });
}

export const config = {
  matcher: ["/admin/conversations", "/admin/conversations/:path*"],
};
