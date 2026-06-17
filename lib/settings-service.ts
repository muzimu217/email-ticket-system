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
export async function updateNotificationSettings(settings: NotificationSettings): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('system_settings')
    .update({ value: settings, updated_at: new Date().toISOString() })
    .eq('key', 'notification');
  if (error) console.error('updateNotificationSettings error:', error);
  return { success: !error, error: error?.message };
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
export async function updateAssignmentSettings(settings: AssignmentSettings): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('system_settings')
    .update({ value: settings, updated_at: new Date().toISOString() })
    .eq('key', 'assignment');
  if (error) console.error('updateAssignmentSettings error:', error);
  return { success: !error, error: error?.message };
}
