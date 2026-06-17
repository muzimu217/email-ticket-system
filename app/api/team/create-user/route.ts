// app/api/team/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUserAndMember } from '@/lib/team-service';
import { requireAdmin } from '@/lib/auth';

/**
 * 一步式创建客服成员（管理员专用）：
 * 原子地建立 Supabase Auth 登录账号 + team_members 资料。
 *
 * 取代旧的"先在 Dashboard 建账号、再回前端填 UUID"两步流程，
 * 避免因插入失败被静默吞掉而产生孤儿账号。
 */
export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, name, role } = body as {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
  };

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: 'email, password, name 为必填' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: '密码至少 8 位' },
      { status: 400 }
    );
  }

  if (role && !['admin', 'agent'].includes(role)) {
    return NextResponse.json(
      { error: '角色只允许 admin 或 agent' },
      { status: 400 }
    );
  }

  const { data: member, error } = await createUserAndMember({
    email,
    password,
    name,
    role,
  });

  if (error) {
    // 409 表示冲突（如邮箱已存在），其余按 400 处理
    const conflict =
      error.includes('已存在') || error.includes('已是登录账号') || error.includes('重复');
    return NextResponse.json(
      { error },
      { status: conflict ? 409 : 400 }
    );
  }

  return NextResponse.json({ member }, { status: 201 });
}
