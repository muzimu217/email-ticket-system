// lib/auth.ts
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

/**
 * 从请求 cookie 中提取 access token
 */
function extractAccessToken(cookieValue: string): string {
  // @supabase/ssr cookie 格式: base64-<base64编码的JSON>
  if (cookieValue.startsWith('base64-')) {
    try {
      const decoded = Buffer.from(cookieValue.slice(7), 'base64').toString();
      const parsed = JSON.parse(decoded);
      if (parsed.access_token) return parsed.access_token;
    } catch {
      // 解码失败
    }
  }

  // 直接 JSON 格式
  try {
    const parsed = JSON.parse(cookieValue);
    if (parsed.access_token) return parsed.access_token;
  } catch {
    // 原始 JWT
  }

  return cookieValue;
}

/**
 * 从请求中获取当前用户及其角色
 */
export async function getCurrentUser(request: NextRequest): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  const supabaseProjectRef = 'sdwkolculkrwbfmgmvht';
  const cookieName = `sb-${supabaseProjectRef}-auth-token`;
  const authCookie = request.cookies.get(cookieName)?.value;

  if (!authCookie) return null;

  try {
    const accessToken = extractAccessToken(authCookie);

    // 用 anon key 验证 JWT
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) return null;

    // 用 service role 查角色
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: member } = await serviceClient
      .from('team_members')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email || '',
      role: member?.role || 'agent',
    };
  } catch {
    return null;
  }
}

/**
 * 检查请求用户是否为管理员
 */
export async function requireAdmin(request: NextRequest): Promise<{
  isAdmin: boolean;
  user: { id: string; email: string; role: string } | null;
}> {
  const user = await getCurrentUser(request);
  return {
    isAdmin: user?.role === 'admin',
    user,
  };
}
