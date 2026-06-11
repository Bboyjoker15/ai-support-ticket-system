'use client';

import Link from 'next/link';
import { SearchX, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        >
          <SearchX size={64} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
        </motion.div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          404
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Esta página no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: 'var(--color-brand)',
            color: '#ffffff',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <ArrowLeft size={16} />
          Volver al Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
