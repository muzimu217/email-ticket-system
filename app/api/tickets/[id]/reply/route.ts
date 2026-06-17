// app/api/tickets/[id]/reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/brevo';
import { buildReplyToAddress } from '@/lib/thread-tracker';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content } = await request.json();

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 1. 获取工单信息
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  // 2. 构建回复地址（带 token，客户回复时能追踪回此工单）
  const replyToAddress = buildReplyToAddress(ticket.ticket_token);

  // 3. 通过 Brevo 发送邮件给客户
  const htmlContent = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      ${content.replace(/\n/g, '<br/>')}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 24px;" />
      <p style="color: #9ca3af; font-size: 12px;">
        回复此邮件将继续此工单对话。
      </p>
    </div>
  `;

  await sendEmail({
    to: ticket.from_email,
    subject: `Re: ${ticket.subject}`,
    htmlContent,
    replyTo: replyToAddress,
    replyToName: process.env.SUPPORT_EMAIL_NAME || 'OpenSource Club Support',
  });

  // 4. 保存出站消息记录
  const { data: message } = await supabase
    .from('messages')
    .insert({
      ticket_id: id,
      direction: 'outbound',
      from_email: process.env.SUPPORT_EMAIL || 'opensource-club@kcos.club',
      to_email: ticket.from_email,
      subject: `Re: ${ticket.subject}`,
      content,
      content_type: 'text/html',
    })
    .select()
    .single();

  // 5. 更新工单状态为处理中
  await supabase
    .from('tickets')
    .update({
      status: 'processing',
      last_message_at: new Date().toISOString(),
    })
    .eq('id', id);

  return NextResponse.json({ success: true, message });
}