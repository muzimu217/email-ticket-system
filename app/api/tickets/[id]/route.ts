// app/api/tickets/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTicketWithMessages, updateTicketStatus } from '@/lib/ticket-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getTicketWithMessages(id);

  if (!result) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!body.status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }

  const ticket = await updateTicketStatus(id, body.status, body.changedBy);

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}