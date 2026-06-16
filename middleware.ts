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

  // API 路由暂不做认证检查
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 页面路由检查 Supabase session cookie
  // Supabase SSR 使用项目特定的 cookie 名称: sb-<project-ref>-auth-token
  const supabaseProjectRef = 'sdwkolculkrwbfmgmvht';
  const authCookie = request.cookies.get(`sb-${supabaseProjectRef}-auth-token`)?.value;

  // 也检查可能的备用 cookie 名称
  const hasSession = authCookie ||
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('supabase-auth-token')?.value;

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};