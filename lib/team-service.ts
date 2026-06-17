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
 *
 * 返回 { data, error }：不再吞掉错误。上层（API/前端）必须据 error 决定响应，
 * 否则会出现"插入失败但前端假装成功"的孤儿账号问题。
 */
export async function createTeamMember(
  userId: string,
  email: string,
  name: string,
  role: string = 'agent'
): Promise<{ data: TeamMember | null; error: string | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
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

  if (error) {
    return { data: null, error: friendlyMemberError(error) };
  }
  return { data, error: null };
}

/**
 * 一步式创建客服成员：原子地建 auth 登录账号 + team_members 资料。
 *
 * 之所以需要这个函数：auth.users(登录) 和 team_members(资料) 是两张表，
 * 旧流程要手动两步，任何一步失败都会留下"半成品"孤儿账号。
 * 这里在 team_members 插入失败时补偿删除刚建的 auth 账号，保证不留孤儿。
 */
export async function createUserAndMember(input: {
  email: string;
  password: string;
  name: string;
  role?: string;
}): Promise<{ data: TeamMember | null; error: string | null }> {
  const supabase = getSupabase();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role || 'agent';

  // 1. 用 service role 在 Supabase Auth 创建登录账号
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true, // 管理员建号默认免邮箱验证
    user_metadata: { name, role },
  });

  if (createError) {
    return { data: null, error: friendlyAuthError(createError) };
  }
  const userId = created.user.id;

  // 2. 插入 team_members；失败则补偿删除 auth 账号，避免孤儿
  const { data: member, error: memberError } = await createTeamMember(userId, email, name, role);
  if (memberError || !member) {
    await supabase.auth.admin.deleteUser(userId);
    return {
      data: null,
      error: memberError
        ? `${memberError}（已自动回滚登录账号，未产生残留）`
        : '创建成员资料失败，已自动回滚登录账号',
    };
  }

  return { data: member, error: null };
}

/** 把 Supabase auth 错误翻译成中文可读信息 */
function friendlyAuthError(error: { message?: string; code?: string }): string {
  const msg = error.message || '';
  if (msg.includes('already been registered') || msg.includes('already exists') || error.code === 'user_already_exists') {
    return `该邮箱已是登录账号，不能重复创建（${msg}）`;
  }
  if (msg.includes('password')) {
    return `密码不符合要求：${msg}`;
  }
  return `创建登录账号失败：${msg}`;
}

/** 把 team_members 插入错误翻译成中文可读信息 */
function friendlyMemberError(error: { message?: string; code?: string }): string {
  const msg = error.message || '';
  if (error.code === '23505') {
    // 唯一约束冲突
    if (msg.includes('team_members_email_key')) return '该邮箱已存在客服成员，不能重复添加';
    if (msg.includes('team_members_pkey')) return '该用户已存在客服成员记录，不能重复添加';
    return '唯一约束冲突：该成员已存在';
  }
  if (error.code === '23503') {
    return '用户不存在或 UUID 无效（外键约束失败）';
  }
  if (error.code === '23514') {
    return '角色无效（只允许 admin / agent）';
  }
  return `创建成员资料失败：${msg}`;
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
