// lib/brevo.ts

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  replyTo?: string;
  replyToName?: string;
}

interface BrevoResponse {
  messageId: string;
}

/**
 * 通过 Brevo REST API 发送邮件
 */
export async function sendEmail(params: SendEmailParams): Promise<BrevoResponse> {
  const { to, toName, subject, htmlContent, replyTo, replyToName } = params;

  const body: Record<string, unknown> = {
    sender: {
      name: process.env.SUPPORT_EMAIL_NAME || 'OpenSource Club Support',
      email: process.env.SUPPORT_EMAIL || 'openopensource-club@kcos.club',
    },
    to: [{ email: to, name: toName || to }],
    subject,
    htmlContent,
  };

  if (replyTo) {
    body.replyTo = { email: replyTo, name: replyToName || replyTo };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brevo send failed (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * 发送工单通知给团队成员
 */
export async function sendTeamNotification(params: {
  teamEmails: string[];
  ticketId: string;
  ticketToken: string;
  fromEmail: string;
  subject: string;
  preview: string;
  adminUrl: string;
}): Promise<void> {
  const { teamEmails, ticketId, ticketToken, fromEmail, subject, preview, adminUrl } = params;

  const htmlContent = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 16px;">新工单通知</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 4px 0;"><strong>工单ID:</strong> ${ticketId.slice(0, 8)}</p>
        <p style="margin: 4px 0;"><strong>客户:</strong> ${fromEmail}</p>
        <p style="margin: 4px 0;"><strong>主题:</strong> ${subject}</p>
        <p style="margin: 4px 0;"><strong>摘要:</strong> ${preview.slice(0, 200)}</p>
      </div>
      <a href="${adminUrl}/tickets/${ticketId}"
         style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
        处理工单
      </a>
      <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
        此邮件由邮件客服系统自动发送，请勿直接回复。
      </p>
    </div>
  `;

  for (const email of teamEmails) {
    await sendEmail({
      to: email,
      subject: `[新工单] ${subject}`,
      htmlContent,
    });
  }
}