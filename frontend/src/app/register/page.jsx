'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password,
      });

      if (authError) throw authError;

      const user = authData?.user;

      if (user) {
        const { error: dbError } = await supabase
          .from('users')
          .insert([{ id: user.id, email: user.email, role: 'User' }]);

        if (dbError) throw dbError;

        setSuccessMsg('¡Cuenta creada con éxito! Redirigiendo...');

        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error) {
      setErrorMsg(error.message || 'Ocurrió un error inesperado al registrarse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: 'var(--color-brand)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: 'var(--color-brand)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <div
          className="rounded-2xl border p-8 shadow-xl"
          style={{
            backgroundColor: 'var(--color-card)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex flex-col items-center mb-8">
            <Logo size="lg" />
            <h2
              className="mt-4 text-xl font-bold tracking-tight"
              style={{ color: 'var(--color-text)' }}
            >
              Crear Cuenta
            </h2>
            <p
              className="mt-1 text-sm text-center"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Tu cuenta se creará como Cliente. Un administrador podrá asignarte el rol de Agente si corresponde.
            </p>
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-xl text-sm border"
                style={{
                  backgroundColor: 'rgba(244,63,94,0.1)',
                  borderColor: 'rgba(244,63,94,0.2)',
                  color: '#f43f5e',
                }}
              >
                {errorMsg}
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 rounded-xl text-sm border flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(16,185,129,0.1)',
                  borderColor: 'rgba(16,185,129,0.2)',
                  color: '#10b981',
                }}
              >
                <CheckCircle size={16} />
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all duration-150"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-brand)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  placeholder="nombre@correo.com"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border outline-none transition-all duration-150"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-brand)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-brand)',
                color: '#ffffff',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus size={16} />
                  Registrarse
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="font-medium transition-colors"
                style={{ color: 'var(--color-brand)' }}
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
