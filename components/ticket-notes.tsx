'use client';

import { useEffect, useState } from 'react';
import { NoteForm } from './note-form';
import type { TicketNote } from '@/lib/types';

interface TicketNotesProps {
  ticketId: string;
  authorId: string;
}

export function TicketNotes({ ticketId, authorId }: TicketNotesProps) {
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, [ticketId]);

  async function fetchNotes() {
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}/notes`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes || []);
    }
    setLoading(false);
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">内部备注</h3>
      {loading ? (
        <p className="text-sm text-gray-400">加载中...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400">暂无备注</p>
      ) : (
        <div className="space-y-2 mb-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {note.author_name || '未知'} · {new Date(note.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
      <NoteForm ticketId={ticketId} authorId={authorId} onSent={fetchNotes} />
    </div>
  );
}
