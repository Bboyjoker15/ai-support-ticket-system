'use client';

import { Sparkles } from 'lucide-react';

export default function Logo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { icon: 16, text: 'text-sm', gap: 1.5 },
    md: { icon: 20, text: 'text-lg', gap: 2 },
    lg: { icon: 28, text: 'text-2xl', gap: 2.5 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-${s.gap}`}>
      <div className="relative">
        <Sparkles
          size={s.icon}
          className="text-indigo-500"
          strokeWidth={2.5}
        />
        <div
          className="absolute inset-0 blur-sm opacity-60"
          style={{ color: 'var(--color-brand)' }}
        >
          <Sparkles size={s.icon} strokeWidth={2.5} />
        </div>
      </div>
      {showText && (
        <span
          className={`font-bold tracking-tight ${s.text}`}
          style={{ color: 'var(--color-text)' }}
        >
          Intelli<span className="text-indigo-500">Desk</span>
        </span>
      )}
    </div>
  );
}
