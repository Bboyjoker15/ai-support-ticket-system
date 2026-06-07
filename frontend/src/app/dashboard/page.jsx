'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation';

export default function DashboardRouterPage() {
  const router = useRouter();

  useEffect(() => {
    const routeByRole = async () => {
      try {
        // 1. Obtener el usuario autenticado
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          router.push('/login');
          return;
        }

        // 2. Consultar de forma estricta su rol en la base de datos
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          // Si por alguna razón está el auth pero no el perfil, enviamos por defecto a user
          router.push('/dashboard/user');
          return;
        }

        // 3. Redirección inteligente y automática basada en roles del sistema
        const role = profile.role;
        if (role === 'Admin') {
          router.push('/dashboard/admin');
        } else if (role === 'Agent') {
          router.push('/dashboard/agent');
        } else {
          router.push('/dashboard/user');
        }

      } catch (err) {
        console.error('Error en el enrutador de dashboard:', err);
        router.push('/login');
      }
    };

    routeByRole();
  }, [router]);

  // Pantalla de transición ultra-limpia mientras se decide la ruta
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col gap-4 items-center justify-center text-white font-medium">
      <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-xs text-slate-500 tracking-widest uppercase animate-pulse">Verificando credenciales de acceso...</span>
    </div>
  );
}