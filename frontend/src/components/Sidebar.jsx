'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { menuItems } from '@/lib/constants';
import Logo from './Logo';

export default function Sidebar({ userRole }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const items = menuItems[userRole?.toLowerCase()] || menuItems.user;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isActive = (href, params) => {
    if (params) return pathname === href;
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      layout
      className="fixed left-0 top-0 h-full z-40 flex flex-col border-r"
      style={{
        backgroundColor: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
        width: collapsed ? 64 : 240,
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {/* Logo + toggle */}
      <div
        className="flex items-center border-b shrink-0"
        style={{
          height: 56,
          borderColor: 'var(--color-border)',
          padding: collapsed ? '0 12px' : '0 16px',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {!collapsed && <Logo size="sm" />}
        {collapsed && <Logo size="sm" showText={false} />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-[var(--color-card-hover)] transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => {
          const active = isActive(item.href, item.params);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href + (item.params || '')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative"
              style={{
                backgroundColor: active ? 'var(--color-brand-muted)' : 'transparent',
                color: active ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              {active && !collapsed && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-indigo-500"
                />
              )}
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 1.5}
                className="shrink-0"
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
          style={{
            color: 'var(--color-text-muted)',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </motion.aside>
  );
}
