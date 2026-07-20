/**
 * Supabase 项目保活脚本
 * 定期调用 API 防止免费版项目被自动暂停
 * 仅执行只读查询，不修改任何数据
 *
 * 用法: node scripts/keepalive.mjs
 * 环境变量: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (从 .env.local 读取)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  // 优先使用真实环境变量（GitHub Actions 等 CI 通过 secrets 注入），
  // 缺省时再回退读取本地 .env.local（本地手动运行时）。
  const env = { ...process.env };
  try {
    const envPath = resolve(__dirname, '..', '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)="?(.*)"?$/);
      if (m) {
        const key = m[1];
        if (env[key] === undefined) env[key] = m[2].replace(/^"|"$/g, '');
      }
    }
  } catch {
    // 无 .env.local 时（如 CI）忽略
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[keepalive] 缺少环境变量，检查 .env.local');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function keepalive() {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  console.log(`\n[${now}] 保活检查开始`);

  // 1. REST API 心跳
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    });
    if (resp.ok || resp.status === 401 || resp.status === 404) {
      console.log('  REST API: 正常');
    } else {
      console.log(`  REST API: HTTP ${resp.status}`);
    }
  } catch (e) {
    console.log(`  REST API: 不可达 (${e.message})`);
  }

  // 2. 查询各表记录数（只读，触发数据库活动）
  const tables = ['tickets', 'messages', 'team_members', 'ticket_notes', 'ticket_status_history', 'system_settings'];
  let totalRecords = 0;
  for (const table of tables) {
    try {
      const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`  ${table}: 错误 - ${error.message}`);
      } else {
        console.log(`  ${table}: ${count ?? 0} 条记录`);
        totalRecords += count ?? 0;
      }
    } catch (e) {
      console.log(`  ${table}: 异常 - ${e.message}`);
    }
  }
  console.log(`  总计: ${totalRecords} 条记录`);

  // 3. Auth API 心跳
  try {
    const { data, error } = await client.auth.admin.listUsers();
    if (!error) {
      console.log(`  Auth 用户: ${data.users.length} 个`);
    }
  } catch (e) {
    // 忽略
  }

  console.log(`[${now}] 保活完成\n`);
}

keepalive().catch(console.error);
