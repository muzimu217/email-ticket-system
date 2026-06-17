'use client';

import { useEffect, useState } from 'react';
import type { NotificationSettings, AssignmentSettings } from '@/lib/types';

export function NotificationSettingsPanel() {
  const [notif, setNotif] = useState<NotificationSettings>({
    newTicketNotifyAll: true,
    replyNotifyAssignee: true,
    replyNotifyAll: false,
  });
  const [assignment, setAssignment] = useState<AssignmentSettings>({
    autoAssign: false,
    roundRobin: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.notification) setNotif(data.notification);
      if (data.assignment) setAssignment(data.assignment);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification: notif, assignment }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-gray-500">加载中...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">系统设置</h1>

      {/* 通知策略 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">通知策略</h2>
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={notif.newTicketNotifyAll}
              onChange={(e) => setNotif({ ...notif, newTicketNotifyAll: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">新工单通知所有活跃成员</span>
              <p className="text-xs text-gray-500">关闭后仅通知已分配的处理人</p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={notif.replyNotifyAssignee}
              onChange={(e) => setNotif({ ...notif, replyNotifyAssignee: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">客户回复通知当前处理人</span>
              <p className="text-xs text-gray-500">工单已有负责人时，仅通知该负责人</p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={notif.replyNotifyAll}
              onChange={(e) => setNotif({ ...notif, replyNotifyAll: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">客户回复通知所有活跃成员</span>
              <p className="text-xs text-gray-500">忽略处理人设置，广播给所有人</p>
            </div>
          </label>
        </div>
      </div>

      {/* 分配策略 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">分配策略</h2>
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={assignment.autoAssign}
              onChange={(e) => setAssignment({ ...assignment, autoAssign: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">自动分配新工单</span>
              <p className="text-xs text-gray-500">新工单创建时自动分配给团队成员</p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={assignment.roundRobin}
              onChange={(e) => setAssignment({ ...assignment, roundRobin: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">轮询分配 (Round Robin)</span>
              <p className="text-xs text-gray-500">按顺序轮流分配给活跃成员，避免工单集中</p>
            </div>
          </label>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ 已保存</span>}
      </div>
    </div>
  );
}
