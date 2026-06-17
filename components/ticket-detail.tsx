'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge } from './status-badge';
import { ReplyForm } from './reply-form';
import { AssignButton } from './assign-button';
import { TicketNotes } from './ticket-notes';
import type { Ticket, Message, TeamMember } from '@/lib/types';

interface TicketDetailProps {
  ticketId: string;
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState('');
  const [currentMemberName, setCurrentMemberName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
    fetchTeamMembers();
    fetchCurrentUser();
  }, [ticketId]);

  async function fetchCurrentUser() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentMemberId(user.id);
        setCurrentMemberName(user.email || '');
      }
    } catch (e) {
      // ignore auth errors
    }
  }

  async function fetchTicket() {
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages);
    }
    setLoading(false);
  }

  async function fetchTeamMembers() {
    const res = await fetch('/api/team');
    if (res.ok) {
      const data = await res.json();
      setTeamMembers(data.members || []);
    }
  }

  async function handleStatusChange(status: string) {
    await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, changedBy: currentMemberId }),
    });
    fetchTicket();
  }

  if (loading) return <p className="text-gray-500">加载中...</p>;
  if (!ticket) return <p className="text-red-500">工单不存在</p>;

  return (
    <div>
      {/* 工单头部信息 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>客户邮箱: {ticket.from_email}</p>
          <p>创建时间: {new Date(ticket.created_at).toLocaleString('zh-CN')}</p>
          <p>最后消息: {ticket.last_message_at ? new Date(ticket.last_message_at).toLocaleString('zh-CN') : '-'}</p>
        </div>

        {/* 认领/分配区域 */}
        <div className="mt-4 pt-4 border-t border-gray-100 relative">
          <AssignButton
            ticketId={ticketId}
            assignedTo={ticket.assigned_to}
            assignedToName={null}
            currentMemberId={currentMemberId}
            currentMemberName={currentMemberName}
            teamMembers={teamMembers}
            onChanged={fetchTicket}
          />
        </div>

        {/* 状态操作按钮 */}
        <div className="flex gap-2 mt-4">
          {ticket.status !== 'processing' && (
            <button
              onClick={() => handleStatusChange('processing')}
              className="px-3 py-1.5 text-sm bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200"
            >
              标记处理中
            </button>
          )}
          {ticket.status !== 'resolved' && (
            <button
              onClick={() => handleStatusChange('resolved')}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
            >
              标记已解决
            </button>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="space-y-4 mb-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-lg ${
              msg.direction === 'inbound'
                ? 'bg-white shadow-sm border-l-4 border-blue-400'
                : 'bg-blue-50 shadow-sm border-l-4 border-green-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {msg.direction === 'inbound' ? `客户 (${msg.from_email})` : '客服回复'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(msg.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <div
              className="text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: msg.content_type === 'text/html' ? (msg.content || '') : (msg.content || '').replace(/\n/g, '<br/>'),
              }}
            />
          </div>
        ))}
      </div>

      {/* 内部备注 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <TicketNotes ticketId={ticketId} authorId={currentMemberId} />
      </div>

      {/* 回复表单 */}
      {ticket.status !== 'resolved' && (
        <ReplyForm ticketId={ticketId} onSent={fetchTicket} />
      )}
    </div>
  );
}
