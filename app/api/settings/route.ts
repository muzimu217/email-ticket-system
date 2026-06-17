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
