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
