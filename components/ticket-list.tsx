// components/ticket-list.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from './status-badge';
import type { Ticket } from '@/lib/types';

export function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  async function fetchTickets() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);

    const res = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.tickets || []);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">工单列表</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="processing">处理中</option>
          <option value="resolved">已解决</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500">暂无工单</p>
      ) : (
        <div className="bg-white shadow-sm rounded-lg divide-y">
          {tickets.map((ticket) => {
            const assignee = (ticket as Ticket & { assignee?: { name: string; email: string } }).assignee;
            return (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={ticket.status} />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </span>
                      {assignee && (
                        <span className="text-xs text-gray-400">
                          {assignee.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {ticket.from_email} · {new Date(ticket.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {!assignee && ticket.status !== 'resolved' && (
                    <span className="text-xs text-orange-500 font-medium">待认领</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}