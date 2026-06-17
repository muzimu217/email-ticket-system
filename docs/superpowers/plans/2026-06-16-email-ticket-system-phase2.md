# 邮件客服工单系统 Phase 2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现邮件客服工单系统第二阶段 — 工单认领和分配、内部备注、团队成员管理、通知策略增强。

**Architecture:** 在 Phase 1 基础上扩展数据库（新增 ticket_notes、ticket_status_history 表），增强 ticket-service 业务逻辑（认领、分配、备注），新增团队成员管理页面和通知策略配置。

**Tech Stack:** Next.js 16 (TypeScript), Supabase (PostgreSQL + Auth), Brevo API, Tailwind CSS

---

## 已有项目信息

- **项目路径:** `/Users/blackevil/Documents/服务研究/email-ticket-system`
- **支持邮箱:** `openopensource-club@kcos.club`
- **Supabase URL:** `https://sdwkolculkrwbfmgmvht.supabase.co`
- **已有数据库表:** tickets, messages, team_members
- **已有功能:** 邮件接收→工单创建→后台查看→回复客户→线程追踪

---

## 文件结构

```
email-ticket-system/
├── app/
│   ├── tickets/
│   │   └── [id]/page.tsx          # 工单详情（增强：认领、备注）
│   ├── team/                       # 新增：团队成员管理
│   │   └── page.tsx
│   ├── settings/                   # 新增：通知策略配置
│   │   └── page.tsx
│   └── api/
│       ├── tickets/
│       │   ├── [id]/
│       │   │   ├── route.ts        # 增强：认领、分配
│       │   │   ├── notes/
│       │   │   │   └── route.ts    # 新增：内部备注 CRUD
│       │   │   └── assign/
│       │   │       └── route.ts    # 新增：认领/分配
│       ├── team/
│       │   └── route.ts            # 新增：团队成员管理 API
│       └── settings/
│           └── route.ts            # 新增：通知策略配置 API
├── lib/
│   ├── ticket-service.ts           # 增强：认领、分配逻辑
│   ├── team-service.ts             # 新增：团队成员管理逻辑
│   ├── notification-service.ts     # 新增：通知策略引擎
│   ├── settings-service.ts         # 新增：系统配置读写
│   └── types.ts                    # 增强：新增类型定义
├── components/
│   ├── ticket-detail.tsx           # 增强：认领按钮、备注区
│   ├── assign-button.tsx           # 新增：认领/分配组件
│   ├── ticket-notes.tsx            # 新增：内部备注组件
│   ├── note-form.tsx               # 新增：备注输入表单
│   ├── team-list.tsx               # 新增：团队成员列表
│   ├── team-member-form.tsx        # 新增：成员编辑表单
│   ├── notification-settings.tsx   # 新增：通知策略配置
│   └── nav.tsx                     # 新增：导航栏
├── supabase/migrations/
│   └── 002_phase2_schema.sql       # 新增：备注、状态历史表
└── docs/superpowers/plans/
    └── 2026-06-16-email-ticket-system-phase2.md
```

---

## Task 1: 数据库 Schema 扩展 (Phase 2)

**Files:**
- Create: `supabase/migrations/002_phase2_schema.sql`
- Modify: `lib/types.ts`

- [ ] **Step 1: 编写数据库迁移 SQL**

Create `supabase/migrations/002_phase2_schema.sql`:

```sql
-- supabase/migrations/002_phase2_schema.sql

-- 内部备注表
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

-- team_members 表增加 update 权限
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
```

- [ ] **Step 2: 在 Supabase Dashboard 执行迁移**

登录 Supabase Dashboard → SQL Editor → 粘贴 `002_phase2_schema.sql` 执行。

- [ ] **Step 3: 更新 TypeScript 类型定义**

在 `lib/types.ts` 末尾追加:

```typescript
// 内部备注
export interface TicketNote {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name?: string;
  content: string;
  created_at: string;
}

// 状态变更历史
export interface StatusHistory {
  id: string;
  ticket_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name?: string;
  changed_at: string;
}

// 系统设置
export interface NotificationSettings {
  newTicketNotifyAll: boolean;
  replyNotifyAssignee: boolean;
  replyNotifyAll: boolean;
}

export interface AssignmentSettings {
  autoAssign: boolean;
  roundRobin: boolean;
}

// 工单详情（增强版，包含分配信息）
export interface TicketWithDetails extends Ticket {
  assigned_to_name?: string;
  assigned_to_email?: string;
}
```

- [ ] **Step 4: 提交**

```bash
git add supabase/migrations/002_phase2_schema.sql lib/types.ts
git commit -m "feat: add phase2 database schema (notes, status history, settings)"
```

---

## Task 2: 工单认领和分配逻辑

**Files:**
- Modify: `lib/ticket-service.ts`
- Create: `app/api/tickets/[id]/assign/route.ts`

- [ ] **Step 1: 在 ticket-service.ts 添加认领和分配函数**

在 `lib/ticket-service.ts` 文件末尾追加以下函数:

```typescript
/**
 * 认领工单
 */
export async function claimTicket(ticketId: string, memberId: string, memberName: string): Promise<Ticket | null> {
  const supabase = getSupabase();
  const { data: ticket } = await supabase
    .from('tickets')
    .update({
      assigned_to: memberId,
      status: 'processing',
      last_message_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .single();

  // 记录状态变更历史
  if (ticket) {
    await supabase.from('ticket_status_history').insert({
      ticket_id: ticketId,
      old_status: null,
      new_status: 'processing',
      changed_by: memberId,
    });
  }

  return ticket;
}

/**
 * 分配工单给指定成员
 */
export async function assignTicket(ticketId: string, assigneeId: string, assignerId: string): Promise<Ticket | null> {
  const supabase = getSupabase();
  const { data: ticket } = await supabase
    .from('tickets')
    .update({
      assigned_to: assigneeId,
      status: 'processing',
    })
    .eq('id', ticketId)
    .select()
    .single();

  if (ticket) {
    await supabase.from('ticket_status_history').insert({
      ticket_id: ticketId,
      old_status: null,
      new_status: 'processing',
      changed_by: assignerId,
    });
  }

  return ticket;
}

/**
 * 获取所有活跃团队成员
 */
export async function getActiveTeamMembers(): Promise<TeamMember[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .eq('is_active', true)
    .order('name');
  return data || [];
}
```

在文件顶部添加 import（如果还没有）:

```typescript
import type { Ticket, Message, MoeMailWebhookPayload, TeamMember } from './types';
```

- [ ] **Step 2: 创建认领/分配 API 端点**

Create `app/api/tickets/[id]/assign/route.ts`:

```typescript
// app/api/tickets/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { claimTicket, assignTicket } from '@/lib/ticket-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action, memberId, assigneeId } = body;

  if (action === 'claim') {
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }
    const ticket = await claimTicket(id, memberId, body.memberName || '');
    return NextResponse.json({ ticket });
  }

  if (action === 'assign') {
    if (!assigneeId || !memberId) {
      return NextResponse.json({ error: 'assigneeId and memberId are required' }, { status: 400 });
    }
    const ticket = await assignTicket(id, assigneeId, memberId);
    return NextResponse.json({ ticket });
  }

  return NextResponse.json({ error: 'Invalid action. Use "claim" or "assign".' }, { status: 400 });
}
```

- [ ] **Step 3: 增强状态更新函数，记录历史**

在 `lib/ticket-service.ts` 中，将 `updateTicketStatus` 函数替换为:

```typescript
/**
 * 更新工单状态（带历史记录）
 */
export async function updateTicketStatus(
  ticketId: string,
  status: string,
  changedBy?: string
): Promise<Ticket | null> {
  const supabase = getSupabase();

  // 获取当前状态
  const { data: current } = await supabase
    .from('tickets')
    .select('status')
    .eq('id', ticketId)
    .single();

  const updates: Record<string, unknown> = { status };
  if (status === 'resolved') {
    updates.resolved_at = new Date().toISOString();
  } else if (status === 'closed') {
    updates.closed_at = new Date().toISOString();
  }

  const { data } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();

  // 记录状态变更历史
  if (data && current) {
    await supabase.from('ticket_status_history').insert({
      ticket_id: ticketId,
      old_status: current.status,
      new_status: status,
      changed_by: changedBy || null,
    });
  }

  return data;
}
```

- [ ] **Step 4: 提交**

```bash
git add lib/ticket-service.ts app/api/tickets/[id]/assign/
git commit -m "feat: add ticket claim and assignment functionality"
```

---

## Task 3: 内部备注功能

**Files:**
- Modify: `lib/ticket-service.ts`
- Create: `app/api/tickets/[id]/notes/route.ts`

- [ ] **Step 1: 在 ticket-service.ts 添加备注函数**

在 `lib/ticket-service.ts` 文件末尾追加:

```typescript
/**
 * 获取工单的内部备注
 */
export async function getTicketNotes(ticketId: string): Promise<TicketNote[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('ticket_notes')
    .select(`
      *,
      author:team_members(name)
    `)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  return (data || []).map((note: Record<string, unknown>) => ({
    id: note.id as string,
    ticket_id: note.ticket_id as string,
    author_id: note.author_id as string,
    author_name: (note.author as Record<string, unknown>)?.name as string,
    content: note.content as string,
    created_at: note.created_at as string,
  }));
}

/**
 * 添加内部备注
 */
export async function addTicketNote(
  ticketId: string,
  authorId: string,
  content: string
): Promise<TicketNote | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('ticket_notes')
    .insert({
      ticket_id: ticketId,
      author_id: authorId,
      content,
    })
    .select(`
      *,
      author:team_members(name)
    `)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    ticket_id: data.ticket_id,
    author_id: data.author_id,
    author_name: data.author?.name,
    content: data.content,
    created_at: data.created_at,
  };
}

/**
 * 删除内部备注
 */
export async function deleteTicketNote(noteId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('ticket_notes')
    .delete()
    .eq('id', noteId);
  return !error;
}
```

在文件顶部添加 import（如果还没有）:

```typescript
import type { Ticket, Message, MoeMailWebhookPayload, TeamMember, TicketNote } from './types';
```

- [ ] **Step 2: 创建备注 API 端点**

Create `app/api/tickets/[id]/notes/route.ts`:

```typescript
// app/api/tickets/[id]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTicketNotes, addTicketNote, deleteTicketNote } from '@/lib/ticket-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notes = await getTicketNotes(id);
  return NextResponse.json({ notes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, authorId } = await request.json();

  if (!content || !authorId) {
    return NextResponse.json({ error: 'content and authorId are required' }, { status: 400 });
  }

  const note = await addTicketNote(id, authorId, content);

  if (!note) {
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }

  return NextResponse.json({ note });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get('noteId');

  if (!noteId) {
    return NextResponse.json({ error: 'noteId is required' }, { status: 400 });
  }

  const success = await deleteTicketNote(noteId);
  return NextResponse.json({ success });
}
```

- [ ] **Step 3: 提交**

```bash
git add lib/ticket-service.ts app/api/tickets/[id]/notes/
git commit -m "feat: add internal ticket notes CRUD"
```

---

## Task 4: 团队成员管理服务

**Files:**
- Create: `lib/team-service.ts`
- Create: `app/api/team/route.ts`

- [ ] **Step 1: 创建团队成员服务**

Create `lib/team-service.ts`:

```typescript
// lib/team-service.ts
import { createServiceClient } from './supabase/server';
import type { TeamMember } from './types';

function getSupabase() {
  return createServiceClient();
}

/**
 * 获取所有团队成员
 */
export async function getAllTeamMembers(): Promise<TeamMember[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

/**
 * 更新团队成员信息
 */
export async function updateTeamMember(
  memberId: string,
  updates: { name?: string; role?: string; is_active?: boolean }
): Promise<TeamMember | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single();
  return data;
}

/**
 * 创建团队成员记录（需先在 Supabase Auth 创建用户）
 */
export async function createTeamMember(
  userId: string,
  email: string,
  name: string,
  role: string = 'agent'
): Promise<TeamMember | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('team_members')
    .insert({
      id: userId,
      email,
      name,
      role,
      is_active: true,
    })
    .select()
    .single();
  return data;
}

/**
 * 删除团队成员记录（不删除 auth.users）
 */
export async function deleteTeamMember(memberId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId);
  return !error;
}
```

- [ ] **Step 2: 创建团队成员管理 API**

Create `app/api/team/route.ts`:

```typescript
// app/api/team/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllTeamMembers, updateTeamMember, createTeamMember, deleteTeamMember } from '@/lib/team-service';

export async function GET() {
  const members = await getAllTeamMembers();
  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, email, name, role } = body;

  if (!userId || !email || !name) {
    return NextResponse.json({ error: 'userId, email, name are required' }, { status: 400 });
  }

  const member = await createTeamMember(userId, email, name, role);
  return NextResponse.json({ member });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { memberId, updates } = body;

  if (!memberId || !updates) {
    return NextResponse.json({ error: 'memberId and updates are required' }, { status: 400 });
  }

  const member = await updateTeamMember(memberId, updates);
  return NextResponse.json({ member });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');

  if (!memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
  }

  const success = await deleteTeamMember(memberId);
  return NextResponse.json({ success });
}
```

- [ ] **Step 3: 提交**

```bash
git add lib/team-service.ts app/api/team/
git commit -m "feat: add team member management service and API"
```

---

## Task 5: 系统设置与通知策略服务

**Files:**
- Create: `lib/settings-service.ts`
- Create: `app/api/settings/route.ts`

- [ ] **Step 1: 创建设置服务**

Create `lib/settings-service.ts`:

```typescript
// lib/settings-service.ts
import { createServiceClient } from './supabase/server';
import type { NotificationSettings, AssignmentSettings } from './types';

function getSupabase() {
  return createServiceClient();
}

/**
 * 获取通知策略设置
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'notification')
    .single();

  if (!data) {
    return {
      newTicketNotifyAll: true,
      replyNotifyAssignee: true,
      replyNotifyAll: false,
    };
  }

  return data.value as NotificationSettings;
}

/**
 * 更新通知策略设置
 */
export async function updateNotificationSettings(settings: NotificationSettings): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key: 'notification',
      value: settings,
      updated_at: new Date().toISOString(),
    });
  return !error;
}

/**
 * 获取分配策略设置
 */
export async function getAssignmentSettings(): Promise<AssignmentSettings> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'assignment')
    .single();

  if (!data) {
    return {
      autoAssign: false,
      roundRobin: false,
    };
  }

  return data.value as AssignmentSettings;
}

/**
 * 更新分配策略设置
 */
export async function updateAssignmentSettings(settings: AssignmentSettings): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key: 'assignment',
      value: settings,
      updated_at: new Date().toISOString(),
    });
  return !error;
}
```

- [ ] **Step 2: 创建设置 API**

Create `app/api/settings/route.ts`:

```typescript
// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getAssignmentSettings,
  updateAssignmentSettings,
} from '@/lib/settings-service';

export async function GET() {
  const [notification, assignment] = await Promise.all([
    getNotificationSettings(),
    getAssignmentSettings(),
  ]);
  return NextResponse.json({ notification, assignment });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (body.notification) {
    await updateNotificationSettings(body.notification);
  }

  if (body.assignment) {
    await updateAssignmentSettings(body.assignment);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: 提交**

```bash
git add lib/settings-service.ts app/api/settings/
git commit -m "feat: add system settings and notification policy service"
```

---

## Task 6: 增强通知引擎

**Files:**
- Create: `lib/notification-service.ts`
- Modify: `lib/ticket-service.ts`

- [ ] **Step 1: 创建智能通知引擎**

Create `lib/notification-service.ts`:

```typescript
// lib/notification-service.ts
import { createServiceClient } from './supabase/server';
import { sendEmail } from './brevo';
import { getNotificationSettings } from './settings-service';
import type { Ticket, TeamMember } from './types';

function getSupabase() {
  return createServiceClient();
}

/**
 * 发送新工单通知（根据通知策略决定通知范围）
 */
export async function notifyNewTicket(
  ticket: Ticket,
  fromEmail: string,
  subject: string,
  preview: string
): Promise<void> {
  const settings = await getNotificationSettings();
  const supabase = getSupabase();

  let recipients: string[] = [];

  if (settings.newTicketNotifyAll) {
    // 通知所有活跃成员
    const { data: members } = await supabase
      .from('team_members')
      .select('email')
      .eq('is_active', true);
    recipients = (members || []).map((m: { email: string }) => m.email);
  } else if (ticket.assigned_to) {
    // 只通知分配的处理人
    const { data: member } = await supabase
      .from('team_members')
      .select('email')
      .eq('id', ticket.assigned_to)
      .single();
    if (member) recipients = [member.email];
  }

  if (recipients.length === 0) return;

  const adminUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const htmlContent = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 16px;">新工单通知</h2>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 4px 0;"><strong>工单ID:</strong> ${ticket.id.slice(0, 8)}</p>
        <p style="margin: 4px 0;"><strong>客户:</strong> ${fromEmail}</p>
        <p style="margin: 4px 0;"><strong>主题:</strong> ${subject}</p>
        <p style="margin: 4px 0;"><strong>摘要:</strong> ${preview.slice(0, 200)}</p>
      </div>
      <a href="${adminUrl}/tickets/${ticket.id}"
         style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
        处理工单
      </a>
    </div>
  `;

  for (const email of recipients) {
    await sendEmail({
      to: email,
      subject: `[新工单] ${subject}`,
      htmlContent,
    });
  }
}

/**
 * 发送客户回复通知（根据策略通知处理人）
 */
export async function notifyCustomerReply(
  ticket: Ticket,
  fromEmail: string,
  preview: string
): Promise<void> {
  const settings = await getNotificationSettings();
  const supabase = getSupabase();

  let recipients: string[] = [];

  if (settings.replyNotifyAssignee && ticket.assigned_to) {
    // 只通知当前处理人
    const { data: member } = await supabase
      .from('team_members')
      .select('email')
      .eq('id', ticket.assigned_to)
      .single();
    if (member) recipients = [member.email];
  }

  if (settings.replyNotifyAll || recipients.length === 0) {
    // 通知所有活跃成员
    const { data: members } = await supabase
      .from('team_members')
      .select('email')
      .eq('is_active', true);
    recipients = (members || []).map((m: { email: string }) => m.email);
  }

  if (recipients.length === 0) return;

  const adminUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const htmlContent = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 16px;">客户回复通知</h2>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 4px 0;"><strong>工单ID:</strong> ${ticket.id.slice(0, 8)}</p>
        <p style="margin: 4px 0;"><strong>客户:</strong> ${fromEmail}</p>
        <p style="margin: 4px 0;"><strong>主题:</strong> ${ticket.subject}</p>
        <p style="margin: 4px 0;"><strong>摘要:</strong> ${preview.slice(0, 200)}</p>
      </div>
      <a href="${adminUrl}/tickets/${ticket.id}"
         style="display: inline-block; background: #d97706; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
        查看回复
      </a>
    </div>
  `;

  for (const email of recipients) {
    await sendEmail({
      to: email,
      subject: `[客户回复] ${ticket.subject}`,
      htmlContent,
    });
  }
}
```

- [ ] **Step 2: 在 ticket-service.ts 中集成新通知引擎**

在 `lib/ticket-service.ts` 中修改 `handleInboundEmail` 函数，替换通知调用:

将 import 行改为:
```typescript
import { notifyNewTicket, notifyCustomerReply } from './notification-service';
```

在 `handleInboundEmail` 函数中，将 `notifyTeam` 调用替换:

```typescript
  // 4. 通知团队
  if (isNew) {
    await notifyNewTicket(ticket, fromAddress, subject, messageContent);
  } else {
    // 客户回复，通知处理人
    await notifyCustomerReply(ticket, fromAddress, messageContent);
  }
```

删除旧的 `notifyTeam` 函数和 `sendTeamNotification` import。

- [ ] **Step 3: 提交**

```bash
git add lib/notification-service.ts lib/ticket-service.ts
git commit -m "feat: add smart notification engine with policy support"
```

---

## Task 7: 导航栏组件

**Files:**
- Create: `components/nav.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 创建导航栏组件**

Create `components/nav.tsx`:

```tsx
// components/nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/tickets', label: '工单' },
  { href: '/team', label: '团队' },
  { href: '/settings', label: '设置' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/tickets" className="text-lg font-bold text-gray-900">
          邮件工单系统
        </Link>
        <div className="flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                pathname?.startsWith(item.href)
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 在 layout.tsx 中添加导航栏**

修改 `app/layout.tsx`，在 body 中加入 Nav:

```tsx
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "工单管理系统",
  description: "邮件工单管理后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <Nav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add components/nav.tsx app/layout.tsx
git commit -m "feat: add navigation bar component"
```

---

## Task 8: 工单详情页增强（认领 + 备注）

**Files:**
- Create: `components/assign-button.tsx`
- Create: `components/ticket-notes.tsx`
- Create: `components/note-form.tsx`
- Modify: `components/ticket-detail.tsx`

- [ ] **Step 1: 创建认领/分配组件**

Create `components/assign-button.tsx`:

```tsx
// components/assign-button.tsx
'use client';

import { useState } from 'react';
import type { TeamMember } from '@/lib/types';

interface AssignButtonProps {
  ticketId: string;
  assignedTo: string | null;
  assignedToName: string | null;
  currentMemberId: string;
  currentMemberName: string;
  teamMembers: TeamMember[];
  onChanged: () => void;
}

export function AssignButton({
  ticketId,
  assignedTo,
  assignedToName,
  currentMemberId,
  currentMemberName,
  teamMembers,
  onChanged,
}: AssignButtonProps) {
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClaim() {
    setLoading(true);
    await fetch(`/api/tickets/${ticketId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'claim',
        memberId: currentMemberId,
        memberName: currentMemberName,
      }),
    });
    setLoading(false);
    onChanged();
  }

  async function handleAssign(assigneeId: string) {
    setLoading(true);
    await fetch(`/api/tickets/${ticketId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'assign',
        memberId: currentMemberId,
        assigneeId,
      }),
    });
    setLoading(false);
    setShowAssignMenu(false);
    onChanged();
  }

  if (assignedTo) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          负责人: <span className="font-medium text-gray-900">{assignedToName}</span>
        </span>
        {assignedTo !== currentMemberId && (
          <button
            onClick={handleClaim}
            disabled={loading}
            className="text-sm text-blue-600 hover:underline"
          >
            认领
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClaim}
        disabled={loading}
        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '认领中...' : '认领工单'}
      </button>
      <button
        onClick={() => setShowAssignMenu(!showAssignMenu)}
        className="text-sm text-gray-600 hover:underline"
      >
        分配给...
      </button>
      {showAssignMenu && (
        <div className="absolute z-10 mt-1 bg-white shadow-lg rounded-md border border-gray-200 py-1 min-w-[200px]">
          {teamMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => handleAssign(member.id)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {member.name} ({member.email})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建备注表单组件**

Create `components/note-form.tsx`:

```tsx
// components/note-form.tsx
'use client';

import { useState } from 'react';

interface NoteFormProps {
  ticketId: string;
  authorId: string;
  onSent: () => void;
}

export function NoteForm({ ticketId, authorId, onSent }: NoteFormProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSending(true);
    const res = await fetch(`/api/tickets/${ticketId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, authorId }),
    });

    if (res.ok) {
      setContent('');
      onSent();
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
        placeholder="添加内部备注（仅团队成员可见）..."
        required
      />
      <button
        type="submit"
        disabled={sending || !content.trim()}
        className="mt-2 px-3 py-1.5 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
      >
        {sending ? '添加中...' : '添加备注'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: 创建备注列表组件**

Create `components/ticket-notes.tsx`:

```tsx
// components/ticket-notes.tsx
'use client';

import { useEffect, useState } from 'react';
import { NoteForm } from './note-form';
import type { TicketNote } from '@/lib/types';

interface TicketNotesProps {
  ticketId: string;
  authorId: string;
}

export function TicketNotes({ ticketId, authorId }: TicketNotesProps) {
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, [ticketId]);

  async function fetchNotes() {
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}/notes`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes || []);
    }
    setLoading(false);
  }

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">内部备注</h3>
      {loading ? (
        <p className="text-sm text-gray-400">加载中...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-gray-400">暂无备注</p>
      ) : (
        <div className="space-y-2 mb-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-md"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {note.author_name || '未知'} · {new Date(note.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
      <NoteForm ticketId={ticketId} authorId={authorId} onSent={fetchNotes} />
    </div>
  );
}
```

- [ ] **Step 4: 增强 ticket-detail 组件**

修改 `components/ticket-detail.tsx`，添加认领按钮和备注区:

```tsx
// components/ticket-detail.tsx
'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from './status-badge';
import { ReplyForm } from './reply-form';
import { AssignButton } from './assign-button';
import { TicketNotes } from './ticket-notes';
import type { Ticket, Message, TeamMember } from '@/lib/types';

interface TicketDetailProps {
  ticketId: string;
  currentMemberId: string;
  currentMemberName: string;
}

export function TicketDetail({ ticketId, currentMemberId, currentMemberName }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
    fetchTeamMembers();
  }, [ticketId]);

  async function fetchTicket() {
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages);
    }
    setLoading(false);
  }

  async function fetchTeamMembers() {
    const res = await fetch('/api/team');
    if (res.ok) {
      const data = await res.json();
      setTeamMembers(data.members || []);
    }
  }

  async function handleStatusChange(status: string) {
    await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, changedBy: currentMemberId }),
    });
    fetchTicket();
  }

  if (loading) return <p className="text-gray-500">加载中...</p>;
  if (!ticket) return <p className="text-red-500">工单不存在</p>;

  return (
    <div>
      {/* 工单头部信息 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>客户邮箱: {ticket.from_email}</p>
          <p>创建时间: {new Date(ticket.created_at).toLocaleString('zh-CN')}</p>
          <p>最后消息: {ticket.last_message_at ? new Date(ticket.last_message_at).toLocaleString('zh-CN') : '-'}</p>
        </div>

        {/* 认领/分配区域 */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <AssignButton
            ticketId={ticketId}
            assignedTo={ticket.assigned_to}
            assignedToName={null}
            currentMemberId={currentMemberId}
            currentMemberName={currentMemberName}
            teamMembers={teamMembers}
            onChanged={fetchTicket}
          />
        </div>

        {/* 状态操作按钮 */}
        <div className="flex gap-2 mt-4">
          {ticket.status !== 'processing' && (
            <button
              onClick={() => handleStatusChange('processing')}
              className="px-3 py-1.5 text-sm bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200"
            >
              标记处理中
            </button>
          )}
          {ticket.status !== 'resolved' && (
            <button
              onClick={() => handleStatusChange('resolved')}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
            >
              标记已解决
            </button>
          )}
          {ticket.status !== 'closed' && (
            <button
              onClick={() => handleStatusChange('closed')}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              关闭工单
            </button>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="space-y-4 mb-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-lg ${
              msg.direction === 'inbound'
                ? 'bg-white shadow-sm border-l-4 border-blue-400'
                : 'bg-blue-50 shadow-sm border-l-4 border-green-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {msg.direction === 'inbound' ? `客户 (${msg.from_email})` : '客服回复'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(msg.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
            <div
              className="text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: msg.content_type === 'text/html' ? (msg.content || '') : (msg.content || '').replace(/\n/g, '<br/>'),
              }}
            />
          </div>
        ))}
      </div>

      {/* 内部备注 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <TicketNotes ticketId={ticketId} authorId={currentMemberId} />
      </div>

      {/* 回复表单 */}
      {ticket.status !== 'closed' && (
        <ReplyForm ticketId={ticketId} onSent={fetchTicket} />
      )}
    </div>
  );
}
```

- [ ] **Step 5: 更新工单详情页面传入当前用户信息**

修改 `app/tickets/[id]/page.tsx`:

```tsx
// app/tickets/[id]/page.tsx
import { TicketDetail } from '@/components/ticket-detail';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link href="/tickets" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← 返回工单列表
      </Link>
      <TicketDetail
        ticketId={id}
        currentMemberId={user?.id || ''}
        currentMemberName={user?.email || ''}
      />
    </div>
  );
}
```

- [ ] **Step 6: 提交**

```bash
git add components/assign-button.tsx components/note-form.tsx components/ticket-notes.tsx components/ticket-detail.tsx app/tickets/[id]/page.tsx
git commit -m "feat: add ticket claim, assignment, and internal notes UI"
```

---

## Task 9: 团队成员管理页面

**Files:**
- Create: `components/team-list.tsx`
- Create: `app/team/page.tsx`

- [ ] **Step 1: 创建团队成员列表组件**

Create `components/team-list.tsx`:

```tsx
// components/team-list.tsx
'use client';

import { useEffect, useState } from 'react';
import type { TeamMember, TeamRole } from '@/lib/types';

export function TeamList() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'agent' as TeamRole, is_active: true });

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    const res = await fetch('/api/team');
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
    }
    setLoading(false);
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.id);
    setEditForm({ name: member.name, role: member.role, is_active: member.is_active });
  }

  async function saveEdit(memberId: string) {
    await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, updates: editForm }),
    });
    setEditingId(null);
    fetchMembers();
  }

  async function toggleActive(member: TeamMember) {
    await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, updates: { is_active: !member.is_active } }),
    });
    fetchMembers();
  }

  if (loading) return <p className="text-gray-500">加载中...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">团队成员</h1>
      <div className="bg-white shadow-sm rounded-lg divide-y">
        {members.map((member) => (
          <div key={member.id} className="px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              {editingId === member.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as TeamRole })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm ml-2"
                  >
                    <option value="agent">客服</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
              ) : (
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                    member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role === 'admin' ? '管理员' : '客服'}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{member.name}</span>
                  <span className={`text-xs ml-2 ${member.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {member.is_active ? '活跃' : '已停用'}
                  </span>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {editingId === member.id ? (
                <>
                  <button
                    onClick={() => saveEdit(member.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 text-sm text-gray-600 hover:underline"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(member)}
                    className="px-3 py-1 text-sm text-blue-600 hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => toggleActive(member)}
                    className="px-3 py-1 text-sm text-gray-600 hover:underline"
                  >
                    {member.is_active ? '停用' : '启用'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">添加新成员</h3>
        <p className="text-sm text-blue-700">
          新成员需要先在 Supabase Dashboard → Authentication → Users 中创建账号，
          然后在下方填入用户 UUID 和信息：
        </p>
        <AddMemberForm onAdded={fetchMembers} />
      </div>
    </div>
  );
}

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, name, role: 'agent' }),
    });
    if (res.ok) {
      setUserId('');
      setEmail('');
      setName('');
      onAdded();
    }
    setSending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
      <input
        type="text"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        placeholder="Supabase User UUID"
        className="px-3 py-2 border border-gray-300 rounded text-sm"
        required
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="邮箱"
        className="px-3 py-2 border border-gray-300 rounded text-sm"
        required
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="姓名"
        className="px-3 py-2 border border-gray-300 rounded text-sm"
        required
      />
      <button
        type="submit"
        disabled={sending}
        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? '添加中...' : '添加'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: 创建团队成员管理页面**

Create `app/team/page.tsx`:

```tsx
// app/team/page.tsx
import { TeamList } from '@/components/team-list';

export default function TeamPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <TeamList />
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add components/team-list.tsx app/team/
git commit -m "feat: add team member management page"
```

---

## Task 10: 通知策略配置页面

**Files:**
- Create: `components/notification-settings.tsx`
- Create: `app/settings/page.tsx`

- [ ] **Step 1: 创建通知策略配置组件**

Create `components/notification-settings.tsx`:

```tsx
// components/notification-settings.tsx
'use client';

import { useEffect, useState } from 'react';
import type { NotificationSettings, AssignmentSettings } from '@/lib/types';

export function NotificationSettings() {
  const [notif, setNotif] = useState<NotificationSettings>({
    newTicketNotifyAll: true,
    replyNotifyAssignee: true,
    replyNotifyAll: false,
  });
  const [assignment, setAssignment] = useState<AssignmentSettings>({
    autoAssign: false,
    roundRobin: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.notification) setNotif(data.notification);
      if (data.assignment) setAssignment(data.assignment);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification: notif, assignment }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-gray-500">加载中...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">系统设置</h1>

      {/* 通知策略 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">通知策略</h2>
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={notif.newTicketNotifyAll}
              onChange={(e) => setNotif({ ...notif, newTicketNotifyAll: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">新工单通知所有活跃成员</span>
              <p className="text-xs text-gray-500">关闭后仅通知已分配的处理人</p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={notif.replyNotifyAssignee}
              onChange={(e) => setNotif({ ...notif, replyNotifyAssignee: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">客户回复通知当前处理人</span>
              <p className="text-xs text-gray-500">工单已有负责人时，仅通知该负责人</p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={notif.replyNotifyAll}
              onChange={(e) => setNotif({ ...notif, replyNotifyAll: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">客户回复通知所有活跃成员</span>
              <p className="text-xs text-gray-500">忽略处理人设置，广播给所有人</p>
            </div>
          </label>
        </div>
      </div>

      {/* 分配策略 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">分配策略</h2>
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={assignment.autoAssign}
              onChange={(e) => setAssignment({ ...assignment, autoAssign: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">自动分配新工单</span>
              <p className="text-xs text-gray-500">新工单创建时自动分配给团队成员</p>
            </div>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={assignment.roundRobin}
              onChange={(e) => setAssignment({ ...assignment, roundRobin: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="text-sm font-medium">轮询分配 (Round Robin)</span>
              <p className="text-xs text-gray-500">按顺序轮流分配给活跃成员，避免工单集中</p>
            </div>
          </label>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        {saved && <span className="text-sm text-green-600">✓ 已保存</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建设置页面**

Create `app/settings/page.tsx`:

```tsx
// app/settings/page.tsx
import { NotificationSettings } from '@/components/notification-settings';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <NotificationSettings />
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add components/notification-settings.tsx app/settings/
git commit -m "feat: add notification policy and assignment settings page"
```

---

## Task 11: 工单列表增强（显示负责人）

**Files:**
- Modify: `components/ticket-list.tsx`
- Modify: `lib/ticket-service.ts`

- [ ] **Step 1: 增强 getTickets 返回负责人信息**

在 `lib/ticket-service.ts` 中修改 `getTickets` 函数:

```typescript
/**
 * 获取工单列表（含负责人信息）
 */
export async function getTickets(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Ticket[]> {
  const supabase = getSupabase();
  let query = supabase
    .from('tickets')
    .select(`
      *,
      assignee:team_members!assigned_to(name, email)
    `)
    .order('last_message_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data } = await query;
  return data || [];
}
```

- [ ] **Step 2: 工单列表显示负责人**

修改 `components/ticket-list.tsx`，在工单项中添加负责人显示:

```tsx
// components/ticket-list.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from './status-badge';
import type { Ticket } from '@/lib/types';

export function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  async function fetchTickets() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);

    const res = await fetch(`/api/tickets?${params}`);
    const data = await res.json();
    setTickets(data.tickets || []);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">工单列表</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">全部状态</option>
          <option value="new">新建</option>
          <option value="pending">待处理</option>
          <option value="processing">处理中</option>
          <option value="resolved">已解决</option>
          <option value="closed">已关闭</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : tickets.length === 0 ? (
        <p className="text-gray-500">暂无工单</p>
      ) : (
        <div className="bg-white shadow-sm rounded-lg divide-y">
          {tickets.map((ticket) => {
            const assignee = (ticket as Ticket & { assignee?: { name: string; email: string } }).assignee;
            return (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={ticket.status} />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {ticket.subject}
                      </span>
                      {assignee && (
                        <span className="text-xs text-gray-400">
                          {assignee.name}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {ticket.from_email} · {new Date(ticket.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {!assignee && ticket.status !== 'closed' && (
                    <span className="text-xs text-orange-500 font-medium">待认领</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add components/ticket-list.tsx lib/ticket-service.ts
git commit -m "feat: show assignee info in ticket list"
```

---

## Task 12: 部署与验证

- [ ] **Step 1: 本地构建验证**

```bash
cd /Users/blackevil/Documents/服务研究/email-ticket-system
npm run build
```

Expected: 构建成功，无错误

- [ ] **Step 2: 提交所有变更**

```bash
git add -A
git commit -m "feat: phase 2 complete - team collaboration features"
```

- [ ] **Step 3: 部署到 Vercel**

```bash
vercel --prod
```

- [ ] **Step 4: 在 Supabase 执行 Phase 2 SQL**

在 Supabase SQL Editor 执行 `supabase/migrations/002_phase2_schema.sql`

- [ ] **Step 5: 端到端验证**

1. 登录后台，检查导航栏出现"工单/团队/设置"
2. 打开一个工单，点击"认领工单"
3. 确认工单状态变为"处理中"，负责人显示
4. 在工单详情添加内部备注，确认显示
5. 进入"团队"页面，编辑成员信息
6. 进入"设置"页面，修改通知策略，保存
7. 发送测试邮件，验证通知策略生效

---

## 完成标准

Phase 2 完成后，系统应支持：

1. 工单认领 — 客服点击"认领"按钮接管工单
2. 工单分配 — 管理员可分配工单给指定成员
3. 内部备注 — 团队成员可添加仅内部可见的备注
4. 团队成员管理 — 管理员可编辑成员信息、角色、停用/启用
5. 通知策略配置 — 配置新工单和客户回复的通知范围
6. 状态历史 — 每次状态变更都有记录
7. 导航栏 — 工单/团队/设置三个入口