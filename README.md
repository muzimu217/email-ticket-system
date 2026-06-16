# Email Ticket System - 邮件客服工单系统

> 一个基于 Next.js + Supabase + Brevo 的开源邮件客服工单系统

## 项目简介

Email Ticket System 是一个完整的邮件客服解决方案，将客户邮件自动转化为工单，支持团队协作处理、状态流转、客户回复追踪等功能。

### 核心特性

- **邮件自动创建工单** - 客户发邮件到支持邮箱，系统自动创建工单
- **线程追踪** - 使用 `+` 地址 token 方案（如 `support+tk-abc123@domain.com`）追踪客户回复
- **团队通知** - 新工单自动通知团队成员
- **Web 管理后台** - 查看工单列表、详情、回复客户
- **状态流转** - new → pending → processing → resolved → closed
- **邮件统一出口** - 所有回复以官方支持邮箱名义发送

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      系统架构图                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐  │
│  │ MoeMail      │─────▶│  Webhook     │─────▶│ 工单处理  │  │
│  │ 域名邮箱      │      │  /api/webhook│      │  引擎    │  │
│  └──────────────┘      └──────────────┘      └──────────┘  │
│                                │              │             │
│                                ▼              ▼             │
│                         ┌──────────────┐  ┌──────────────┐ │
│                         │  Supabase    │  │   Brevo      │ │
│                         │  PostgreSQL  │  │   邮件发送   │ │
│                         └──────────────┘  └──────────────┘ │
│                                │              │             │
│                                ▼              ▼             │
│                         ┌──────────────┐  ┌──────────────┐ │
│                         │  工单数据     │  │  团队通知    │ │
│                         │  消息记录     │  │  客户回复    │ │
│                         └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 (App Router) | React 框架，支持 SSR |
| 数据库 | Supabase PostgreSQL | PostgreSQL + Auth + RLS |
| 邓邓发送 | Brevo API | 免费 300封/天 |
| 入站邮件 | MoeMail Webhook | 自有域名邮箱 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 部署 | Vercel | 无服务器部署 |

## 项目结构

```
email-ticket-system/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # 重定向到 /tickets
│   ├── login/page.tsx        # 登录页面
│   ├── tickets/
│   │   ├── page.tsx          # 工单列表
│   │   └── [id]/page.tsx     # 工单详情 + 回复
│   └── api/
│       ├── webhook/email/route.ts  # MoeMail Webhook
│       ├── tickets/
│       │   ├── route.ts            # 工单列表 API
│       │   ├── [id]/route.ts       # 工单详情/状态更新
│       │   └── [id]/reply/route.ts # 回复客户
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client
│   │   └── server.ts         # Server client (service role)
│   ├── brevo.ts              # Brevo 邮件发送封装
│   ├── ticket-service.ts     # 工单业务逻辑
│   ├── thread-tracker.ts     # +地址 token 解析与生成
│   └── types.ts              # TypeScript 类型定义
├── components/
│   ├── ticket-list.tsx       # 工单列表组件
│   ├── ticket-detail.tsx     # 工单详情组件
│   ├── reply-form.tsx        # 回复表单组件
│   └── status-badge.tsx      # 状态标签组件
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # 数据库 schema
├── middleware.ts             # 认证中间件
├── .env.local.example        # 环境变量示例
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

## 数据库设计

### tickets 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| ticket_token | TEXT | +地址追踪标识 |
| from_email | TEXT | 客户邮箱 |
| subject | TEXT | 工单标题 |
| status | TEXT | new/pending/processing/resolved/closed |
| assigned_to | UUID | 分配给团队成员 |
| last_message_at | TIMESTAMPTZ | 最后消息时间 |
| resolved_at | TIMESTAMPTZ | 解决时间 |
| closed_at | TIMESTAMPTZ | 关闭时间 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

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
| moemail_message_id | TEXT | MoeMail 消息 ID |
| created_at | TIMESTAMPTZ | 创建时间 |

### team_members 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 关联 auth.users |
| email | TEXT | 邮箱 |
| name | TEXT | 姓名 |
| role | TEXT | admin/agent |
| is_active | BOOLEAN | 是否活跃 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

## 状态流转

```text
新建 (new) → 待处理 (pending) → 处理中 (processing) → 已解决 (resolved) → 已关闭 (closed)
                    ↑                    |                   |
                    |____________________|                   |
                    客户回复/重新打开                       客户回复则重新打开
```

- 新邮件创建工单后，初始状态为 `new`
- 客服回复后，状态变为 `processing`
- 客服认为问题解决，设为 `resolved`
- 客户在 `resolved` 或 `closed` 状态下回复，自动重新打开为 `pending`
- 管理员可手动关闭工单

## 线程追踪方案

由于 MoeMail Webhook 不提供 Message-ID / In-Reply-To / References 头部，我们使用 **`+` 地址 token 方案**：

1. 新工单创建时，生成唯一 token（如 `tk-abc123def456`）
2. 回复客户时，设置 Reply-To 为 `openopensource-club+tk-abc123def456@kcos.club`
3. 客户回复到此地址时，系统解析 token 并归并到原工单

```
客户 ──▶ support@domain.com ──▶ 系统创建工单 (token: tk-abc123)
客服回复 ──▶ Reply-To: support+tk-abc123@domain.com
客户回复 ──▶ support+tk-abc123@domain.com ──▶ 系统解析 token，归并工单
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-org/email-ticket-system.git
cd email-ticket-system
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入实际值：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Brevo
BREVO_API_KEY=your-brevo-api-key

# MoeMail
MOEMAIL_WEBHOOK_SECRET=your-webhook-secret

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# App
SUPPORT_EMAIL=support@your-domain.com
SUPPORT_EMAIL_NAME=Your Support Team
```

### 4. 创建 Supabase 表

在 Supabase SQL Editor 执行 `supabase/migrations/001_initial_schema.sql`

### 5. 创建管理员用户

1. 在 Supabase Dashboard → Authentication → Users 创建用户
2. 执行 SQL 插入 team_members 记录：

```sql
INSERT INTO team_members (id, email, name, role, is_active)
VALUES ('用户UUID', 'admin@your-domain.com', 'Admin', 'admin', true);
```

### 6. 启动开发服务器

```bash
npm run dev
```

### 7. 部署到 Vercel

```bash
vercel --prod
```

### 8. 配置邮件 Webhook

在邮件服务商后台设置 Webhook URL：
```
https://your-app.vercel.app/api/webhook/email
```

## 外部服务配置

### Brevo 邮件发送

1. 注册 Brevo 账号：https://app.brevo.com
2. 创建 API Key：Settings → SMTP & API → API Keys
3. 添加发送域名：Settings → Senders, Domains
4. 配置 DNS（DKIM/SPF）

### Supabase 数据库

1. 创建项目：https://supabase.com
2. 获取 URL 和 Keys：Project Settings → API
3. 执行 SQL schema
4. 配置 RLS（已在 schema 中包含）

## 开发经验总结

### 关键技术点

1. **Next.js 16 Turbopack** - 构建速度更快，但 Google Fonts 网络问题需改用系统字体
2. **Supabase SSR** - 客户端需延迟初始化避免构建时环境变量错误
3. **Middleware Cookie** - Supabase cookie 名称格式为 `sb-<project-ref>-auth-token`
4. **+地址追踪** - 解决邮件服务商不提供邮件头部的问题
5. **RLS 策略** - service_role 可跳过 RLS，authenticated 用户受限制

### 遇到的问题与解决方案

| 问题 | 解决方案 |
|------|----------|
| Google Fonts 无法加载 | 使用系统字体替代 |
| 构建时 Supabase 初始化失败 | 延迟初始化，在函数内调用 createClient |
| Middleware cookie 名称错误 | 使用 `sb-<project-ref>-auth-token` 格式 |
| Webhook 返回 401 | 移除签名验证，适配邮件服务商 header 格式 |

### Phase 1 完成功能

- [x] 项目初始化 (Next.js + Supabase + Tailwind)
- [x] 数据库 Schema 设计
- [x] Supabase 客户端配置
- [x] 线程追踪模块 (+地址 token)
- [x] Brevo 邮件发送模块
- [x] 工单业务逻辑
- [x] Webhook 端点
- [x] 工单 API 端点
- [x] 管理后台认证
- [x] 管理后台 UI
- [x] Vercel 部署
- [x] 邮件到工单闭环测试
- [x] 回复客户闭环测试

## Phase 2 规划

- [ ] 工单认领和分配
- [ ] 状态流转增强
- [ ] 内部备注功能
- [ ] 团队成员管理 UI
- [ ] 通知策略配置

## Phase 3 规划

- [ ] SLA 超时提醒
- [ ] 自动关闭机制
- [ ] 回复模板
- [ ] WebSocket 实时通知
- [ ] 统计报表
- [ ] 审计日志

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

- 项目地址：https://github.com/your-org/email-ticket-system
- 问题反馈：https://github.com/your-org/email-ticket-system/issues

---

**Built with ❤️ for better customer support**