'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <AlertTriangle size={48} className="text-rose-500" strokeWidth={1.5} />
        </motion.div>
        <h1 className="mt-6 text-xl font-bold" style={{ color: 'var(--color-text)' }}>
          Algo salió mal
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {error?.message || 'Ocurrió un error inesperado. Intenta de nuevo.'}
        </p>
        <button
          onClick={reset}
          className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: 'var(--color-brand)',
            color: '#ffffff',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <RefreshCw size={16} />
          Reintentar
        </button>
      </motion.div>
    </div>
  );
}
