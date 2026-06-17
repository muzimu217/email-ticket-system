# Email Ticket System - 开源邮件客服工单系统

> 一个基于 Next.js + Supabase + Brevo + MoeMail 的开源邮件客服工单系统

## 项目简介

Email Ticket System 是一个完整的邮件客服解决方案，将客户邮件自动转化为工单，支持团队协作处理、状态流转、内部备注、客户回复追踪等功能。

**你没有修改 MoeMail 的代码。** MoeMail 作为独立服务部署在 Cloudflare 上，本项目仅通过其 Webhook 接收入站邮件。

### 核心特性

- **邮件自动创建工单** - 客户发邮件到支持邮箱，系统自动创建工单
- **线程追踪** - 使用 `+` 地址 token 方案（如 `support+tk-abc123@domain.com`）追踪客户回复
- **团队通知** - 新工单自动通知团队成员（支持通知策略配置）
- **工单认领与分配** - 客服可认领工单，管理员可分配给指定成员
- **内部备注** - 团队成员可添加内部备注（客户不可见）
- **角色权限控制** - admin / agent 两级权限
- **Web 管理后台** - 工单列表、详情、回复、团队管理、系统设置
- **状态流转** - pending → processing → resolved（含状态历史记录）
- **邮件统一出口** - 所有回复以官方支持邮箱名义发送
- **Webhook 地址过滤** - 只接受发到客服邮箱的邮件，其他邮箱一律忽略

## 系统架构

```
客户邮件 → support@your-domain.com
         → Cloudflare Email Routing (MX 记录)
         → Catch-all 规则 → MoeMail email-receiver-worker
         → MoeMail D1 存储 + Webhook 触发
         → https://your-app.vercel.app/api/webhook/email
         → 地址过滤（仅客服邮箱）
         → 创建工单 + 通知团队
         → Supabase 存储 + Brevo 发送通知/回复
```

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 (App Router) | React 框架，支持 SSR |
| 数据库 | Supabase PostgreSQL | PostgreSQL + Auth + RLS |
| 出站邮件 | Brevo API | 免费 300封/天 |
| 入站邮件 | [MoeMail](https://github.com/beilunyang/moemail) | 自部署的域名邮箱服务（未修改其代码） |
| 样式 | Tailwind CSS | 原子化 CSS |
| 部署 | Vercel | 无服务器部署 |

## 项目结构

```
email-ticket-system/
├── app/                              # Next.js App Router
│   ├── login/                        # 登录页面
│   ├── tickets/                      # 工单列表 + 详情
│   ├── team/                         # 团队管理（admin）
│   ├── settings/                     # 系统设置（admin）
│   └── api/
│       ├── webhook/email/            # MoeMail Webhook 入口
│       ├── tickets/                  # 工单 CRUD + 回复 + 认领 + 分配
│       ├── tickets/[id]/notes/       # 内部备注 CRUD
│       ├── team/                     # 团队成员管理
│       └── settings/                 # 通知/分配策略
├── lib/
│   ├── supabase/                     # Supabase 客户端（browser + server）
│   ├── brevo.ts                      # Brevo 邮件发送
│   ├── ticket-service.ts             # 工单业务逻辑
│   ├── team-service.ts               # 团队管理逻辑
│   ├── settings-service.ts           # 系统设置
│   ├── notification-service.ts       # 智能通知引擎
│   ├── thread-tracker.ts             # +地址 token 解析与生成
│   ├── auth.ts                       # 服务端鉴权（admin/agent）
│   └── types.ts                      # TypeScript 类型定义
├── components/                       # React 组件
├── supabase/migrations/              # 数据库迁移 SQL
│   ├── 001_initial_schema.sql        # Phase 1 表结构
│   └── 002_phase2_schema.sql         # Phase 2 表结构
├── middleware.ts                     # 认证中间件
└── .env.local.example                # 环境变量模板
```

## 快速开始

### 前置条件

你需要准备：
1. 一个域名（用于接收邮件）
2. Cloudflare 账号（管理域名 DNS + Email Routing）
3. GitHub 账号
4. Supabase 账号（免费）
5. Brevo 账号（免费 300封/天）
6. Vercel 账号（免费）

### 第 1 步：部署 MoeMail（入站邮件服务）

MoeMail 是一个开源的临时邮箱服务，负责接收域名邮件并通过 Webhook 转发。

> 本项目**不修改** MoeMail 的任何代码，仅使用其 Webhook 功能。

1. 按照 [MoeMail 官方文档](https://github.com/beilunyang/moemail) 部署到 Cloudflare
2. 在 Cloudflare Dashboard 配置 Email Routing：
   - MX 记录指向 `route1/2/3.mx.cloudflare.net`（MoeMail 部署时会自动配置）
   - 添加 Catch-all 规则：所有邮件 → `email-receiver-worker`
3. 在 MoeMail 控制台创建邮箱：`support@your-domain.com`
4. 在 MoeMail 控制台配置 Webhook（**部署完本系统后再做**，见第 7 步）

### 第 2 步：克隆项目

```bash
git clone https://github.com/muzimu217/email-ticket-system.git
cd email-ticket-system
npm install
```

### 第 3 步：创建 Supabase 项目

1. 注册 [Supabase](https://supabase.com)，创建新项目
2. 在 SQL Editor 执行：
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_phase2_schema.sql`
3. 添加外键约束（工单分配功能需要）：
   ```sql
   ALTER TABLE tickets
   ADD CONSTRAINT fk_tickets_assigned_to
   FOREIGN KEY (assigned_to) REFERENCES team_members(id) ON DELETE SET NULL;
   ```
4. 在 Settings → API 获取 URL、anon key、service role key

### 第 4 步：创建管理员账号

1. 在 Supabase Dashboard → Authentication → Users 添加用户
2. 执行 SQL 插入 team_members：

```sql
INSERT INTO team_members (id, email, name, role, is_active)
VALUES ('用户UUID', 'admin@your-domain.com', 'Admin', 'admin', true);
```

### 第 5 步：配置 Brevo（出站邮件）

1. 注册 [Brevo](https://app.brevo.com)
2. 创建 API Key：Settings → SMTP & API → API Keys
3. 添加发送域名并配置 DNS（DKIM/SPF）

### 第 6 步：配置环境变量

复制 `.env.local.example` 为 `.env.local`：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Brevo
BREVO_API_KEY=your-brevo-api-key

# App
SUPPORT_EMAIL=support@your-domain.com
SUPPORT_EMAIL_NAME=Your Support Team
```

> **重要：** 将 `lib/thread-tracker.ts` 中的 `SUPPORT_EMAIL_LOCAL` 和 `SUPPORT_EMAIL_DOMAIN` 改为你的域名。

### 第 7 步：部署到 Vercel

```bash
vercel --prod
```

部署完成后，记住你的域名（如 `https://your-app.vercel.app`）。

### 第 8 步：配置 MoeMail Webhook

回到 MoeMail 控制台，设置 Webhook URL：

```
https://your-app.vercel.app/api/webhook/email
```

### 第 9 步：测试

1. 用外部邮箱发一封邮件到 `support@your-domain.com`
2. 登录工单系统 `https://your-app.vercel.app/login`
3. 应该能看到新工单

## 数据库设计

### tickets 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| ticket_token | TEXT | +地址追踪标识 |
| from_email | TEXT | 客户邮箱 |
| subject | TEXT | 工单标题 |
| status | TEXT | pending/processing/resolved |
| assigned_to | UUID | 分配给团队成员 |
| last_message_at | TIMESTAMPTZ | 最后消息时间 |
| created_at | TIMESTAMPTZ | 创建时间 |

### messages 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| ticket_id | UUID | 关联工单 |
| direction | TEXT | inbound/outbound |
| from_email | TEXT | 发件人 |
| to_email | TEXT | 收件人 |
| subject | TEXT | 主题 |
| content | TEXT | 内容 |
| content_type | TEXT | text/plain 或 text/html |

### team_members 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 关联 auth.users |
| email | TEXT | 邮箱 |
| name | TEXT | 姓名 |
| role | TEXT | admin/agent |
| is_active | BOOLEAN | 是否活跃 |

### Phase 2 新增表

| 表名 | 说明 |
|------|------|
| ticket_notes | 内部备注（客户不可见） |
| ticket_status_history | 状态变更历史 |
| system_settings | 通知策略、分配策略（JSON 存储） |

## 状态流转

```
待处理 (pending) → 处理中 (processing) → 已解决 (resolved)
      ↑                    |
      |____________________|
      客户回复重新打开
```

## 线程追踪方案

由于 MoeMail Webhook 不提供 Message-ID / In-Reply-To / References 头部，使用 **`+` 地址 token 方案**：

```
客户 ──▶ support@domain.com ──▶ 系统创建工单 (token: tk-abc123)
客服回复 ──▶ Reply-To: support+tk-abc123@domain.com
客户回复 ──▶ support+tk-abc123@domain.com ──▶ 系统解析 token，归并工单
```

## Webhook 安全过滤

MoeMail 的 Webhook 是按用户级别的（所有邮箱的邮件都会触发）。本项目在 Webhook 端点增加了地址过滤：

- 只接受 `toAddress` 为 `support@your-domain.com` 的邮件（新工单）
- 只接受 `toAddress` 为 `support+tk-xxx@your-domain.com` 的邮件（回复跟进）
- 其他地址返回 `{ ignored: true }`，不创建工单

## 功能清单

### Phase 1 - 基础功能 ✅

- [x] 邮件到工单自动转换
- [x] 线程追踪（+地址 token）
- [x] Brevo 邮件发送
- [x] 工单 CRUD API
- [x] 管理后台认证
- [x] 工单列表 / 详情 UI

### Phase 2 - 团队协作 ✅

- [x] 工单认领与分配
- [x] 状态流转增强（含历史记录）
- [x] 内部备注
- [x] 团队成员管理 UI
- [x] 通知策略配置（新工单通知、分配通知）
- [x] 角色权限控制（admin / agent）
- [x] Webhook 地址安全过滤

### Phase 3 - 规划中

- [ ] SLA 超时提醒
- [ ] 自动关闭机制
- [ ] 回复模板
- [ ] WebSocket 实时通知
- [ ] 统计报表
- [ ] 审计日志

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License

## 相关项目

- [MoeMail](https://github.com/beilunyang/moemail) - 入站邮件服务（独立部署，本项目未修改其代码）
- [Supabase](https://supabase.com) - 后端数据库与认证
- [Brevo](https://www.brevo.com) - 出站邮件发送
- [Next.js](https://nextjs.org) - 前端框架

## 联系方式

- 项目地址：https://github.com/muzimu217/email-ticket-system
- 问题反馈：https://github.com/muzimu217/email-ticket-system/issues

---

**Built for better customer support**
