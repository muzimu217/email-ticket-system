// lib/types.ts

export type TicketStatus = 'new' | 'pending' | 'processing' | 'resolved' | 'closed';
export type MessageDirection = 'inbound' | 'outbound';
export type TeamRole = 'admin' | 'agent';

export interface Ticket {
  id: string;
  ticket_token: string;
  from_email: string;
  subject: string;
  status: TicketStatus;
  assigned_to: string | null;
  last_message_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  direction: MessageDirection;
  from_email: string;
  to_email: string;
  subject: string | null;
  content: string | null;
  content_type: string;
  moemail_message_id: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// MoeMail Webhook payload
export interface MoeMailWebhookPayload {
  emailId: string;
  messageId: string;
  fromAddress: string;
  subject: string;
  content: string;
  html: string;
  receivedAt: string;
  toAddress: string;
}

// 内部备注
export interface TicketNote {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name?: string;
  content: string;
  created_at: string;
}

// 状态变更历史
export interface StatusHistory {
  id: string;
  ticket_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name?: string;
  changed_at: string;
}

// 系统设置
export interface NotificationSettings {
  newTicketNotifyAll: boolean;
  replyNotifyAssignee: boolean;
  replyNotifyAll: boolean;
}

export interface AssignmentSettings {
  autoAssign: boolean;
  roundRobin: boolean;
}

// 工单详情（增强版，包含分配信息）
export interface TicketWithDetails extends Ticket {
  assigned_to_name?: string;
  assigned_to_email?: string;
}
