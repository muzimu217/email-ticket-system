// app/api/team/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllTeamMembers, updateTeamMember, createTeamMember, deleteTeamMember } from '@/lib/team-service';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const members = await getAllTeamMembers();
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, email, name, role } = body;

  if (!userId || !email || !name) {
    return NextResponse.json({ error: 'userId, email, name are required' }, { status: 400 });
  }

  const { data: member, error } = await createTeamMember(userId, email, name, role);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }
  return NextResponse.json({ member });
}

export async function PATCH(request: NextRequest) {
  const { isAdmin } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  const body = await request.json();
  const { memberId, updates } = body;

  if (!memberId || !updates) {
    return NextResponse.json({ error: 'memberId and updates are required' }, { status: 400 });
  }

  const member = await updateTeamMember(memberId, updates);
  return NextResponse.json({ member });
}

export async function DELETE(request: NextRequest) {
  const { isAdmin } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');

  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  }

  const success = await deleteTeamMember(memberId);
  return NextResponse.json({ success });
}
