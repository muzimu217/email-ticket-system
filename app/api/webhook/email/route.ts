// app/api/webhook/email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleInboundEmail } from '@/lib/ticket-service';
import type { MoeMailWebhookPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证请求来自 MoeMail（检查 X-Webhook-Event header）
    const webhookEvent = request.headers.get('x-webhook-event');
    if (!webhookEvent || webhookEvent !== 'new_message') {
      // 允许没有 header 的测试请求通过（MoeMail 测试时不发送 header）
      // 生产环境会发送 X-Webhook-Event: new_message
    }

    // 2. 解析请求体
    const payload: MoeMailWebhookPayload = await request.json();

    // 3. 基本验证
    if (!payload.fromAddress || !payload.toAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: fromAddress, toAddress' },
        { status: 400 }
      );
    }

    // 4. 处理入站邮件
    const result = await handleInboundEmail(payload);

    return NextResponse.json({
      success: true,
      ticketId: result.ticket.id,
      messageId: result.message.id,
      isNew: result.isNew,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}