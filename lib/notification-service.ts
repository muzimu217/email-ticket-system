// lib/notification-service.ts
import { createServiceClient } from './supabase/server';
import { sendEmail } from './brevo';
import { getNotificationSettings } from './settings-service';
import type { Ticket } from './types';

function getSupabase() {
  return createServiceClient();
}

/**
 * 发送新工单通知（根据通知策略决定通知范围）
 */
export async function notifyNewTicket(
  ticket: Ticket,
  fromEmail: string,
  subject: string,
  preview: string
): Promise<void> {
  const settings = await getNotificationSettings();
  const supabase = getSupabase();

  let recipients: string[] = [];

  if (settings.newTicketNotifyAll) {
    const { data: members } = await supabase
      .from('team_members')
      .select('email')
      .eq('is_active', true);
    recipients = (members || []).map((m: { email: string }) => m.email);
  } else if (ticket.assigned_to) {
    const { data: member } = await supabase
      .from('team_members')
      .select('email')
      .eq('id', ticket.assigned_to)
      .single();
    if (member) recipients = [member.email];
  }

  if (recipients.length === 0) return;

  const adminUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const htmlContent = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 16px;">新工单通知</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 4px 0;"><strong>工单ID:</strong> ${ticket.id.slice(0, 8)}</p>
        <p style="margin: 4px 0;"><strong>客户:</strong> ${fromEmail}</p>
        <p style="margin: 4px 0;"><strong>主题:</strong> ${subject}</p>
        <p style="margin: 4px 0;"><strong>摘要:</strong> ${preview.slice(0, 200)}</p>
      </div>
      <a href="${adminUrl}/tickets/${ticket.id}"
         style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
        处理工单
      </a>
    </div>
  `;

  for (const email of recipients) {
    await sendEmail({
      to: email,
      subject: `[新工单] ${subject}`,
      htmlContent,
    });
  }
}

/**
 * 发送客户回复通知（根据策略通知处理人）
 */
export async function notifyCustomerReply(
  ticket: Ticket,
  fromEmail: string,
  preview: string
): Promise<void> {
  const settings = await getNotificationSettings();
  const supabase = getSupabase();

  let recipients: string[] = [];

  if (settings.replyNotifyAssignee && ticket.assigned_to) {
    const { data: member } = await supabase
      .from('team_members')
      .select('email')
      .eq('id', ticket.assigned_to)
      .single();
    if (member) recipients = [member.email];
  }

  if (settings.replyNotifyAll || recipients.length === 0) {
    const { data: members } = await supabase
      .from('team_members')
      .select('email')
      .eq('is_active', true);
    recipients = (members || []).map((m: { email: string }) => m.email);
  }

  if (recipients.length === 0) return;

  const adminUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const htmlContent = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 16px;">客户回复通知</h2>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 4px 0;"><strong>工单ID:</strong> ${ticket.id.slice(0, 8)}</p>
        <p style="margin: 4px 0;"><strong>客户:</strong> ${fromEmail}</p>
        <p style="margin: 4px 0;"><strong>主题:</strong> ${ticket.subject}</p>
        <p style="margin: 4px 0;"><strong>摘要:</strong> ${preview.slice(0, 200)}</p>
      </div>
      <a href="${adminUrl}/tickets/${ticket.id}"
         style="display: inline-block; background: #d97706; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
        查看回复
      </a>
    </div>
  `;

  for (const email of recipients) {
    await sendEmail({
      to: email,
      subject: `[客户回复] ${ticket.subject}`,
      htmlContent,
    });
  }
}
