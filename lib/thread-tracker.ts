// lib/thread-tracker.ts
import { nanoid } from 'nanoid';

const SUPPORT_EMAIL_LOCAL = 'openopensource-club';
const SUPPORT_EMAIL_DOMAIN = 'kcos.club';
const TOKEN_PREFIX = 'tk-';

/**
 * 生成新工单的唯一 ticket_token
 */
export function generateTicketToken(): string {
  return `${TOKEN_PREFIX}${nanoid(12)}`;
}

/**
 * 构建带 ticket token 的 Reply-To 地址
 * 例如: openopensource-club+tk-abc123def456@kcos.club
 */
export function buildReplyToAddress(ticketToken: string): string {
  return `${SUPPORT_EMAIL_LOCAL}+${ticketToken}@${SUPPORT_EMAIL_DOMAIN}`;
}

/**
 * 从 toAddress 中解析 ticket token
 * 输入: "openopensource-club+tk-abc123def456@kcos.club"
 * 输出: "tk-abc123def456" 或 null
 */
export function parseTicketToken(toAddress: string): string | null {
  if (!toAddress) return null;

  const localPart = toAddress.split('@')[0];
  if (!localPart) return null;

  const plusIndex = localPart.indexOf('+');
  if (plusIndex === -1) return null;

  const token = localPart.substring(plusIndex + 1);
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  return token;
}

/**
 * 获取纯支持邮箱地址（无 token）
 */
export function getSupportEmail(): string {
  return `${SUPPORT_EMAIL_LOCAL}@${SUPPORT_EMAIL_DOMAIN}`;
}