// components/reply-form.tsx
'use client';

import { useState } from 'react';

interface ReplyFormProps {
  ticketId: string;
  onSent: () => void;
}

export function ReplyForm({ ticketId, onSent }: ReplyFormProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSending(true);
    setError('');

    const res = await fetch(`/api/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      setContent('');
      onSent();
    } else {
      const data = await res.json();
      setError(data.error || '发送失败');
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <label htmlFor="reply-content" className="block text-sm font-medium text-gray-700 mb-2">
        回复客户
      </label>
      <textarea
        id="reply-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="输入回复内容..."
        required
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      <button
        type="submit"
        disabled={sending || !content.trim()}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? '发送中...' : '发送回复'}
      </button>
    </form>
  );
}