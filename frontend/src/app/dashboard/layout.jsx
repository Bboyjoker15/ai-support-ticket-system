'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const verificarAcceso = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          router.push('/login');
          return;
        }

        const role = profile.role || 'User';
        setUserRole(role);

        if (pathname.startsWith('/dashboard/admin') && role !== 'Admin') {
          if (role === 'Agent') router.push('/dashboard/agent');
          else router.push('/dashboard/user');
          return;
        }

        if (pathname.startsWith('/dashboard/agent') && role !== 'Agent' && role !== 'Admin') {
          router.push('/dashboard/user');
          return;
        }

        if (pathname.startsWith('/dashboard/user') && role !== 'User' && role !== 'Admin') {
          router.push('/dashboard/agent');
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error('Error en el guardián de seguridad:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    verificarAcceso();
  }, [pathname, router]);

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--color-bg)' }} className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
          Verificando acceso...
        </span>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div style={{ backgroundColor: 'var(--color-bg)' }} className="min-h-screen">
      <Sidebar userRole={userRole} />
      <Topbar userRole={userRole} />
      <main
        style={{ marginLeft: 240, marginTop: 56 }}
        className="min-h-[calc(100vh-56px)] p-6 lg:p-8"
      >
        {children}
      </main>
    </div>
  );
}
