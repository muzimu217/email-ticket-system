'use client';

import { useState } from 'react';
import type { TeamMember } from '@/lib/types';

interface AssignButtonProps {
  ticketId: string;
  assignedTo: string | null;
  assignedToName: string | null;
  currentMemberId: string;
  currentMemberName: string;
  teamMembers: TeamMember[];
  onChanged: () => void;
}

export function AssignButton({
  ticketId,
  assignedTo,
  assignedToName,
  currentMemberId,
  currentMemberName,
  teamMembers,
  onChanged,
}: AssignButtonProps) {
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClaim() {
    setLoading(true);
    await fetch(`/api/tickets/${ticketId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'claim',
        memberId: currentMemberId,
        memberName: currentMemberName,
      }),
    });
    setLoading(false);
    onChanged();
  }

  async function handleAssign(assigneeId: string) {
    setLoading(true);
    await fetch(`/api/tickets/${ticketId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign',
        memberId: currentMemberId,
        assigneeId,
      }),
    });
    setLoading(false);
    setShowAssignMenu(false);
    onChanged();
  }

  if (assignedTo) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          负责人: <span className="font-medium text-gray-900">{assignedToName}</span>
        </span>
        {assignedTo !== currentMemberId && (
          <button
            onClick={handleClaim}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline"
          >
            认领
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 relative">
      <button
        onClick={handleClaim}
        disabled={loading}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '认领中...' : '认领工单'}
      </button>
      <button
        onClick={() => setShowAssignMenu(!showAssignMenu)}
        className="text-sm text-gray-600 hover:underline"
      >
        分配给...
      </button>
      {showAssignMenu && (
        <div className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 min-w-[200px]">
          {teamMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => handleAssign(member.id)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {member.name} ({member.email})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
