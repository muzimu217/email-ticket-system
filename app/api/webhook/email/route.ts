// app/api/webhook/email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleInboundEmail } from '@/lib/ticket-service';
import { getSupportEmail, parseTicketToken } from '@/lib/thread-tracker';
import type { MoeMailWebhookPayload } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const payload: MoeMailWebhookPayload = await request.json();

    // 2. 基本验证
    if (!payload.fromAddress || !payload.toAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: fromAddress, toAddress' },
        { status: 400 }
      );
    }

    // 3. 过滤：只接受发到客服邮箱的邮件（含 +token 回复变体）
    //    MoeMail 会把所有邮箱的邮件都转发到 webhook，需要排除非客服邮箱
    const supportEmail = getSupportEmail().toLowerCase();
    const isBaseMatch = payload.toAddress.toLowerCase() === supportEmail;
    const isReplyMatch = parseTicketToken(payload.toAddress) !== null;

    if (!isBaseMatch && !isReplyMatch) {
      return NextResponse.json({ success: true, ignored: true });
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