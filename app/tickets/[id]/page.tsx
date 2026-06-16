// app/tickets/[id]/page.tsx
import { TicketDetail } from '@/components/ticket-detail';
import Link from 'next/link';

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link href="/tickets" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        {'<-'} 返回工单列表
      </Link>
      <TicketDetail ticketId={id} />
    </div>
  );
}