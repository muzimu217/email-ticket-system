// app/tickets/page.tsx
import { TicketList } from '@/components/ticket-list';

export default function TicketsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <TicketList />
    </div>
  );
}