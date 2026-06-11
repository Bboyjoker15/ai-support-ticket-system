'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardRouterPage() {
  const router = useRouter();

  useEffect(() => {
    const routeByRole = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.push('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          router.push('/dashboard/user');
          return;
        }

        const role = profile.role;
        if (role === 'Admin') router.push('/dashboard/admin');
        else if (role === 'Agent') router.push('/dashboard/agent');
        else router.push('/dashboard/user');
      } catch (err) {
        console.error('Error en el enrutador de dashboard:', err);
        router.push('/login');
      }
    };

    routeByRole();
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-brand)',
          }}
        />
        <span
          className="text-xs tracking-widest uppercase animate-pulse"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Verificando credenciales...
        </span>
      </div>
    </div>
  );
}
