// app/api/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getAssignmentSettings,
  updateAssignmentSettings,
} from '@/lib/settings-service';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  const [notification, assignment] = await Promise.all([
    getNotificationSettings(),
    getAssignmentSettings(),
  ]);
  return NextResponse.json({ notification, assignment });
}

export async function PUT(request: NextRequest) {
  const { isAdmin } = await requireAdmin(request);
  if (!isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  const body = await request.json();
  const errors: string[] = [];

  if (body.notification) {
    const result = await updateNotificationSettings(body.notification);
    if (!result.success) errors.push(`notification: ${result.error}`);
  }

  if (body.assignment) {
    const result = await updateAssignmentSettings(body.assignment);
    if (!result.success) errors.push(`assignment: ${result.error}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
