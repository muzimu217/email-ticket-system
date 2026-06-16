// app/api/webhook/email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleInboundEmail } from '@/lib/ticket-service';
import type { MoeMailWebhookPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证 webhook secret（可选，MoeMail 支持时启用）
    const webhookSecret = process.env.MOEMAIL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-webhook-signature');
      if (signature !== webhookSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}