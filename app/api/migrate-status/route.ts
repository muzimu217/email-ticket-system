// @ts-nocheck
// app/api/migrate-status/route.ts
// TEMPORARY: Migrate ticket statuses from 5-state to 3-state. Delete after use.
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:64378561huaW@db.sdwkolculkrwbfmgmvht.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 1. Update existing data
    await pool.query("UPDATE tickets SET status = 'pending' WHERE status = 'new'");
    await pool.query("UPDATE tickets SET status = 'resolved' WHERE status = 'closed'");

    // 2. Update constraint
    await pool.query('ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check');
    await pool.query("ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN ('pending', 'processing', 'resolved'))");
    await pool.query("ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'pending'");

    // 3. Verify
    const { rows } = await pool.query('SELECT status, COUNT(*) FROM tickets GROUP BY status');
    return NextResponse.json({ success: true, distribution: rows });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  } finally {
    await pool.end();
  }
}
