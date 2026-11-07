import { createHash, timingSafeEqual } from "node:crypto";

const ADMIN_USERNAME = "admin";

function safeEqual(a: string, b: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

// Kiểm tra header HTTP Basic Auth. Chưa đặt ADMIN_PASSWORD thì từ chối tất cả,
// để quên cấu hình cũng không làm lộ hội thoại của khách.
export function isAdminAuthorized(authorization: string | null) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !authorization?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return false;

  const usernameMatches = safeEqual(decoded.slice(0, separator), ADMIN_USERNAME);
  const passwordMatches = safeEqual(decoded.slice(separator + 1), password);
  return usernameMatches && passwordMatches;
}
