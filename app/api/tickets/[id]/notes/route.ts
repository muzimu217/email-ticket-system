// app/api/tickets/[id]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTicketNotes, addTicketNote, deleteTicketNote } from '@/lib/ticket-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notes = await getTicketNotes(id);
  return NextResponse.json({ notes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, authorId } = await request.json();

  if (!content || !authorId) {
    return NextResponse.json({ error: 'content and authorId are required' }, { status: 400 });
  }

  const note = await addTicketNote(id, authorId, content);

  if (!note) {
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }

  return NextResponse.json({ note });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get('noteId');

  if (!noteId) {
    return NextResponse.json({ error: 'noteId is required' }, { status: 400 });
  }

  const success = await deleteTicketNote(noteId);
  return NextResponse.json({ success });
}
