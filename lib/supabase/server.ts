// lib/supabase/server.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// 使用 service_role key，跳过 RLS（用于 webhook 处理和后台操作）
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}