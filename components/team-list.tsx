'use client';

import { useEffect, useState } from 'react';
import type { TeamMember, TeamRole } from '@/lib/types';

export function TeamList() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'agent' as TeamRole, is_active: true });

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    const res = await fetch('/api/team');
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
    }
    setLoading(false);
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.id);
    setEditForm({ name: member.name, role: member.role, is_active: member.is_active });
  }

  async function saveEdit(memberId: string) {
    await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, updates: editForm }),
    });
    setEditingId(null);
    fetchMembers();
  }

  async function toggleActive(member: TeamMember) {
    await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, updates: { is_active: !member.is_active } }),
    });
    fetchMembers();
  }

  if (loading) return <p className="text-gray-500">加载中...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">团队成员</h1>
      <div className="bg-white shadow-sm rounded-lg divide-y">
        {members.map((member) => (
          <div key={member.id} className="px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              {editingId === member.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as TeamRole })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm ml-2"
                  >
                    <option value="agent">客服</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
              ) : (
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                    member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role === 'admin' ? '管理员' : '客服'}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{member.name}</span>
                  <span className={`text-xs ml-2 ${member.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {member.is_active ? '活跃' : '已停用'}
                  </span>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {editingId === member.id ? (
                <>
                  <button
                    onClick={() => saveEdit(member.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-sm text-gray-600 hover:underline"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(member)}
                    className="px-3 py-1 text-sm text-blue-600 hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => toggleActive(member)}
                    className="px-3 py-1 text-sm text-gray-600 hover:underline"
                  >
                    {member.is_active ? '停用' : '启用'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">添加新成员</h3>
        <p className="text-sm text-blue-700">
          新成员需要先在 Supabase Dashboard → Authentication → Users 中创建账号，
          然后在下方填入用户 UUID 和信息：
        </p>
        <AddMemberForm onAdded={fetchMembers} />
      </div>
    </div>
  );
}

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, name, role: 'agent' }),
    });
    if (res.ok) {
      setUserId('');
      setEmail('');
      setName('');
      onAdded();
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
      <input
        type="text"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="Supabase User UUID"
        className="px-3 py-2 border border-gray-300 rounded text-sm"
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
        className="px-3 py-2 border border-gray-300 rounded text-sm"
        required
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="姓名"
        className="px-3 py-2 border border-gray-300 rounded text-sm"
        required
      />
      <button
        type="submit"
        disabled={sending}
        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? '添加中...' : '添加'}
      </button>
    </form>
  );
}
