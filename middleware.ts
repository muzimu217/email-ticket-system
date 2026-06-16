// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路由不需要认证
  const publicPaths = ['/login', '/api/webhook'];
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // API 路由检查 Authorization header（简化版，Phase1暂不做完整验证）
  if (pathname.startsWith('/api/')) {
    // API routes for now rely on the frontend having session cookies
    // In Phase2 we can add proper API token auth
    return NextResponse.next();
  }

  // 页面路由检查 cookie 中的 session
  const supabaseToken = request.cookies.get('sb-access-token')?.value;
  if (!supabaseToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};