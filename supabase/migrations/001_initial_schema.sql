-- supabase/migrations/001_initial_schema.sql

-- 工单表
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_token TEXT NOT NULL UNIQUE,  -- 用于 +地址 追踪的唯一标识
  from_email TEXT NOT NULL,           -- 客户邮箱
  subject TEXT NOT NULL,              -- 工单标题（首封邮件主题）
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'resolved')),
  assigned_to UUID REFERENCES auth.users(id),
  last_message_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 邮件消息表
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  content_type TEXT DEFAULT 'text/plain',
  moemail_message_id TEXT,  -- MoeMail 平台侧消息 ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 团队成员表（简单版，Phase 1 用 Supabase Auth 管理登录，此表存额外信息）
CREATE TABLE team_members (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_from_email ON tickets(from_email);
CREATE INDEX idx_tickets_ticket_token ON tickets(ticket_token);
CREATE INDEX idx_messages_ticket_id ON messages(ticket_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 策略（已认证用户可读写）
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tickets"
  ON tickets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tickets"
  ON tickets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tickets"
  ON tickets FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read messages"
  ON messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read team_members"
  ON team_members FOR SELECT TO authenticated USING (true);

-- Service role 可以跳过 RLS（用于 webhook 处理）
CREATE POLICY "Service role full access tickets"
  ON tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access messages"
  ON messages FOR ALL TO service_role USING (true) WITH CHECK (true);
