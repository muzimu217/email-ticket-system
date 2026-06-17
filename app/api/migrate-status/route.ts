// @ts-nocheck
// app/api/migrate-status/route.ts
// TEMPORARY: Migrate ticket statuses from 5-state to 3-state. Delete after use.
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createServiceClient();
  const results = [];

  // 1. Migrate 'new' → 'pending'
  const { error: e1 } = await supabase
    .from('tickets')
    .update({ status: 'pending' })
    .eq('status', 'new');
  results.push(`new→pending: ${e1 ? 'ERROR ' + e1.message : 'OK'}`);

  // 2. Migrate 'closed' → 'resolved'
  const { error: e2 } = await supabase
    .from('tickets')
    .update({ status: 'resolved' })
    .eq('status', 'closed');
  results.push(`closed→resolved: ${e2 ? 'ERROR ' + e2.message : 'OK'}`);

  // 3. Verify distribution
  const { data: dist } = await supabase
    .from('tickets')
    .select('status');
  const counts = {};
  for (const t of dist || []) {
    counts[t.status] = (counts[t.status] || 0) + 1;
  }
  results.push(`distribution: ${JSON.stringify(counts)}`);

  return NextResponse.json({ success: true, results });
}
