-- Phase 2: 内部备注表
CREATE TABLE ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES team_members(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 工单状态变更历史表
CREATE TABLE ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES team_members(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 系统设置表（键值对存储）
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_ticket_notes_ticket_id ON ticket_notes(ticket_id);
CREATE INDEX idx_ticket_notes_created_at ON ticket_notes(created_at);
CREATE INDEX idx_status_history_ticket_id ON ticket_status_history(ticket_id);
CREATE INDEX idx_status_history_changed_at ON ticket_status_history(changed_at);

-- RLS 策略
ALTER TABLE ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ticket_notes"
  ON ticket_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ticket_notes"
  ON ticket_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role full access ticket_notes"
  ON ticket_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read status_history"
  ON ticket_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert status_history"
  ON ticket_status_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role full access status_history"
  ON ticket_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read settings"
  ON system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update settings"
  ON system_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role full access settings"
  ON system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- team_members 表增加 update/insert 权限
CREATE POLICY "Authenticated users can update team_members"
  ON team_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert team_members"
  ON team_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role full access team_members"
  ON team_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 初始化默认设置
INSERT INTO system_settings (key, value) VALUES
  ('notification', '{"newTicketNotifyAll": true, "replyNotifyAssignee": true, "replyNotifyAll": false}'::jsonb),
  ('assignment', '{"autoAssign": false, "roundRobin": false}'::jsonb);
