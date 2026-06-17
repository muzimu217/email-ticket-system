// app/api/team/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllTeamMembers, updateTeamMember, createTeamMember, deleteTeamMember } from '@/lib/team-service';

export async function GET() {
  const members = await getAllTeamMembers();
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, email, name, role } = body;

  if (!userId || !email || !name) {
    return NextResponse.json({ error: 'userId, email, name are required' }, { status: 400 });
  }

  const member = await createTeamMember(userId, email, name, role);
  return NextResponse.json({ member });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { memberId, updates } = body;

  if (!memberId || !updates) {
    return NextResponse.json({ error: 'memberId and updates are required' }, { status: 400 });
  }

  const member = await updateTeamMember(memberId, updates);
  return NextResponse.json({ member });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');

  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  }

  const success = await deleteTeamMember(memberId);
  return NextResponse.json({ success });
}
