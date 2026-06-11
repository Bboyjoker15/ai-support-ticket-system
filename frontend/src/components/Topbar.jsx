'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

export default function Topbar({ userRole }) {
  const pathname = usePathname();

  const pageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/dashboard/user')) return 'Mis Tickets';
    if (pathname.startsWith('/dashboard/agent')) return 'Panel de Agente';
    if (pathname.startsWith('/dashboard/admin')) return 'Panel de Administración';
    return 'IntelliDesk';
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-6 border-b"
      style={{
        backgroundColor: 'var(--color-bg)',
        borderColor: 'var(--color-border)',
        height: 56,
        left: 240,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: page title */}
      <div>
        <h1
          className="text-lg font-semibold tracking-tight"
          style={{ color: 'var(--color-text)' }}
        >
          {pageTitle()}
        </h1>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div
          className="h-8 w-px"
          style={{ backgroundColor: 'var(--color-border)' }}
        />
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-lg"
          style={{
            backgroundColor: 'var(--color-brand-muted)',
            color: 'var(--color-brand)',
          }}
        >
          {userRole || 'User'}
        </span>
      </div>
    </motion.header>
  );
}
