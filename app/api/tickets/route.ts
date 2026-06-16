// app/api/tickets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTickets } from '@/lib/ticket-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  const tickets = await getTickets({ status, limit, offset });
  return NextResponse.json({ tickets });
}