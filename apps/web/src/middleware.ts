import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware đã được đơn giản hóa — không dùng cookie để bảo vệ route.
 *
 * Lý do: Cookie HttpOnly từ BE (cross-domain) không thể đọc được ở đây
 * khi FE deploy trên Vercel và BE deploy riêng.
 *
 * Auth protection được xử lý hoàn toàn ở client-side:
 * - layout.tsx: useEffect kiểm tra isAuthenticated từ Zustand store (localStorage)
 * - Nếu chưa đăng nhập → redirect về /login
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/admin/:path*', '/login'],
};
