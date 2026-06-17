// components/nav.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>('agent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 获取角色
        const res = await fetch('/api/team');
        if (res.ok) {
          const data = await res.json();
          const me = (data.members || []).find((m: { id: string }) => m.id === user.id);
          if (me) setRole(me.role);
        }
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const navItems = [
    { href: '/tickets', label: '工单', adminOnly: false },
    { href: '/team', label: '团队', adminOnly: true },
    { href: '/settings', label: '设置', adminOnly: true },
  ];

  const visibleItems = navItems.filter((item) => !item.adminOnly || role === 'admin');

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/tickets" className="text-lg font-bold text-gray-900">
          邮件工单系统
        </Link>
        <div className="flex items-center gap-6">
          {!loading && visibleItems.map((item) => (
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
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </nav>
  );
}
