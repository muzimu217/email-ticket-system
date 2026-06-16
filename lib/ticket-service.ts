// lib/ticket-service.ts
import { createServiceClient } from './supabase/server';
import { generateTicketToken, buildReplyToAddress, parseTicketToken } from './thread-tracker';
import { sendTeamNotification } from './brevo';
import type { Ticket, Message, MoeMailWebhookPayload } from './types';

const supabase = createServiceClient();

/**
 * 处理入站邮件：创建新工单或追加消息到已有工单
 */
export async function handleInboundEmail(payload: MoeMailWebhookPayload): Promise<{
  ticket: Ticket;
  message: Message;
  isNew: boolean;
}> {
  const { fromAddress, subject, content, html, toAddress, messageId, receivedAt } = payload;

  // 1. 尝试从 toAddress 解析 ticket token
  const ticketToken = parseTicketToken(toAddress);

  let ticket: Ticket;
  let isNew = false;

  if (ticketToken) {
    // 2a. 有 token → 查找已有工单
    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_token', ticketToken)
      .single();

    if (existingTicket) {
      ticket = existingTicket;
      // 客户回复时重新打开工单
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        await supabase
          .from('tickets')
          .update({ status: 'pending', last_message_at: new Date().toISOString() })
          .eq('id', ticket.id);
        ticket.status = 'pending';
      } else {
        await supabase
          .from('tickets')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', ticket.id);
      }
    } else {
      // token 无效，创建新工单
      ticket = await createTicket(fromAddress, subject);
      isNew = true;
    }
  } else {
    // 2b. 无 token → 创建新工单
    ticket = await createTicket(fromAddress, subject);
    isNew = true;
  }

  // 3. 保存消息
  const messageContent = content || html || '';
  const { data: message } = await supabase
    .from('messages')
    .insert({
      ticket_id: ticket.id,
      direction: 'inbound',
      from_email: fromAddress,
      to_email: toAddress,
      subject,
      content: messageContent,
      content_type: html ? 'text/html' : 'text/plain',
      moemail_message_id: messageId,
    })
    .select()
    .single();

  // 4. 新工单时通知团队
  if (isNew) {
    await notifyTeam(ticket, fromAddress, subject, messageContent);
  }

  return { ticket, message: message!, isNew };
}

/**
 * 创建新工单
 */
async function createTicket(fromEmail: string, subject: string): Promise<Ticket> {
  const ticketToken = generateTicketToken();

  const { data: ticket } = await supabase
    .from('tickets')
    .insert({
      ticket_token: ticketToken,
      from_email: fromEmail,
      subject: subject || '(无主题)',
      status: 'new',
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  return ticket!;
}

/**
 * 通知团队有新工单
 */
async function notifyTeam(
  ticket: Ticket,
  fromEmail: string,
  subject: string,
  preview: string
): Promise<void> {
  const { data: members } = await supabase
    .from('team_members')
    .select('email')
    .eq('is_active', true);

  if (!members || members.length === 0) return;

  const teamEmails = members.map((m) => m.email);
  const adminUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  await sendTeamNotification({
    teamEmails,
    ticketId: ticket.id,
    ticketToken: ticket.ticket_token,
    fromEmail,
    subject,
    preview,
    adminUrl,
  });
}

/**
 * 获取工单列表
 */
export async function getTickets(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Ticket[]> {
  let query = supabase
    .from('tickets')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data } = await query;
  return data || [];
}

/**
 * 获取工单详情及消息列表
 */
export async function getTicketWithMessages(ticketId: string): Promise<{
  ticket: Ticket;
  messages: Message[];
} | null> {
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  if (!ticket) return null;

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  return { ticket, messages: messages || [] };
}

/**
 * 更新工单状态
 */
export async function updateTicketStatus(
  ticketId: string,
  status: string
): Promise<Ticket | null> {
  const updates: Record<string, unknown> = { status };

  if (status === 'resolved') {
    updates.resolved_at = new Date().toISOString();
  } else if (status === 'closed') {
    updates.closed_at = new Date().toISOString();
  }

  const { data } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();

  return data;
}