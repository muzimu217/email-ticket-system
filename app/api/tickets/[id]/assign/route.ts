// app/api/tickets/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { claimTicket, assignTicket } from '@/lib/ticket-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action, memberId, assigneeId } = body;

  if (action === 'claim') {
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }
    const ticket = await claimTicket(id, memberId, body.memberName || '');
    return NextResponse.json({ ticket });
  }

  if (action === 'assign') {
    if (!assigneeId || !memberId) {
      return NextResponse.json({ error: 'assigneeId and memberId are required' }, { status: 400 });
    }
    const ticket = await assignTicket(id, assigneeId, memberId);
    return NextResponse.json({ ticket });
  }

  return NextResponse.json({ error: 'Invalid action. Use "claim" or "assign".' }, { status: 400 });
}
