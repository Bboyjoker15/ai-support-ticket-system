'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Logueado con éxito, mandamos al dashboard principal del sistema
      router.push('/dashboard');
    } catch (error) {
      setErrorMsg(error.message || 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 mb-3">
            <span className="text-blue-500 font-bold text-xl">AI</span>
          </div>
          <h2 className="text-2xl font-bold text-white text-center">Iniciar Sesión</h2>
          <p className="text-slate-400 text-sm mt-1">Ingresa a tu panel de soporte</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition duration-150"
              placeholder="nombre@correo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition duration-150"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-600/20 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Validando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            ¿No tienes una cuenta todavía?{' '}
            <button 
              onClick={() => router.push('/register')} 
              className="text-blue-500 hover:underline font-medium bg-transparent border-none p-0 cursor-pointer"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}