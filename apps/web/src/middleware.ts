import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

/**
 * Middleware gốc đã khôi phục lại.
 * Tránh việc next-intl middleware tự ý rewrite các route ngầm gây ra lỗi 404
 * khi sử dụng cấu trúc route không chứa [locale] prefix.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/admin/:path*", "/login"],
};
