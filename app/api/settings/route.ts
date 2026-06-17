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

  let ok = true;
  if (body.notification) {
    ok = await updateNotificationSettings(body.notification) && ok;
  }

  if (body.assignment) {
    ok = await updateAssignmentSettings(body.assignment) && ok;
  }

  return NextResponse.json({ success: ok });
}
