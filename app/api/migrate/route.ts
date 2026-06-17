// app/api/migrate/route.ts
// 临时迁移端点 — 创建 Phase 2 表
import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    // 使用 Supabase /pg/query 端点执行 DDL
    const sql = `
      CREATE TABLE IF NOT EXISTS ticket_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        author_id UUID NOT NULL REFERENCES team_members(id),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS ticket_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by UUID REFERENCES team_members(id),
        changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket_id ON ticket_notes(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_notes_created_at ON ticket_notes(created_at);
      CREATE INDEX IF NOT EXISTS idx_status_history_ticket_id ON ticket_status_history(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON ticket_status_history(changed_at);

      ALTER TABLE ticket_notes ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
      ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "Service role full access ticket_notes"
        ON ticket_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY "Service role full access status_history"
        ON ticket_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);
      CREATE POLICY "Service role full access settings"
        ON system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

      INSERT INTO system_settings (key, value) VALUES
        ('notification', '{"newTicketNotifyAll": true, "replyNotifyAssignee": true, "replyNotifyAll": false}'::jsonb),
        ('assignment', '{"autoAssign": false, "roundRobin": false}'::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `;

    const res = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    const text = await res.text();
    return NextResponse.json({ status: res.status, body: text });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
