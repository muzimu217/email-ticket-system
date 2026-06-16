// components/status-badge.tsx
import type { TicketStatus } from '@/lib/types';

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  new: { label: '新建', className: 'bg-blue-100 text-blue-800' },
  pending: { label: '待处理', className: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '处理中', className: 'bg-purple-100 text-purple-800' },
  resolved: { label: '已解决', className: 'bg-green-100 text-green-800' },
  closed: { label: '已关闭', className: 'bg-gray-100 text-gray-800' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}