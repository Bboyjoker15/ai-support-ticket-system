'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarAcceso = async () => {
      try {
        // 1. Validar si el usuario inició sesión
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/login');
          return;
        }

        // 2. Traer el rol real guardado en la base de datos
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          router.push('/login');
          return;
        }

        const userRole = profile.role || 'User';

        // 3. 🚧 EL FILTRO INTEGRAL DE SEGURIDAD 🚧
        
        // Si intenta entrar a /dashboard/admin y NO es Admin, lo echamos
        if (pathname.startsWith('/dashboard/admin') && userRole !== 'Admin') {
          if (userRole === 'Agent') router.push('/dashboard/agent');
          else router.push('/dashboard/user');
          return;
        }

        // Si intenta entrar a /dashboard/agent y no es Agente ni Administrador, lo echamos
        if (pathname.startsWith('/dashboard/agent') && userRole !== 'Agent' && userRole !== 'Admin') {
          router.push('/dashboard/user');
          return;
        }

        // Si intenta entrar a la zona de usuarios comunes siendo un Agente, lo mandamos a su panel
        if (pathname.startsWith('/dashboard/user') && userRole !== 'User' && userRole !== 'Admin') {
          router.push('/dashboard/agent');
          return;
        }

        // Si pasó todos los filtros de rol, le abrimos la puerta
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

  // Pantalla de carga estética mientras lee Supabase
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col gap-4 items-center justify-center text-white font-medium">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm text-slate-400 tracking-wide animate-pulse">Protegiendo entorno de datos...</span>
      </div>
    );
  }

  // Si no cumple el rol, se bloquea el renderizado por completo
  if (!authorized) return null;

  return <>{children}</>;
}