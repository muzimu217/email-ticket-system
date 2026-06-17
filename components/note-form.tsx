'use client';

import { useState } from 'react';

interface NoteFormProps {
  ticketId: string;
  authorId: string;
  onSent: () => void;
}

export function NoteForm({ ticketId, authorId, onSent }: NoteFormProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSending(true);
    const res = await fetch(`/api/tickets/${ticketId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, authorId }),
    });

    if (res.ok) {
      setContent('');
      onSent();
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
        placeholder="添加内部备注（仅团队成员可见）..."
        required
      />
      <button
        type="submit"
        disabled={sending || !content.trim()}
        className="mt-2 px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
      >
        {sending ? '添加中...' : '添加备注'}
      </button>
    </form>
  );
}
