'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const statusActions = {
  Open: [
    {
      label: 'Atender y Asignarme',
      nextStatus: 'In Progress',
      icon: UserCheck,
      color: 'amber',
    },
  ],
  'In Progress': [
    {
      label: 'Marcar como Resuelto',
      nextStatus: 'Resolved',
      icon: CheckCircle2,
      color: 'emerald',
    },
  ],
  Resolved: [
    {
      label: 'Reabrir Ticket',
      nextStatus: 'In Progress',
      icon: RotateCcw,
      color: 'rose',
    },
  ],
};

export default function TicketAgentActions({
  ticket,
  onStatusChange,
  loading,
}) {
  const [confirming, setConfirming] = useState(null);
  const actions = statusActions[ticket?.status] || [];

  const handleAction = (nextStatus) => {
    if (nextStatus === 'Resolved') {
      setConfirming(nextStatus);
      return;
    }
    onStatusChange(nextStatus);
  };

  const confirmResolve = () => {
    onStatusChange('Resolved');
    setConfirming(null);
  };

  if (!ticket) return null;

  return (
    <div className="space-y-2">
      {confirming === 'Resolved' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-xl border text-sm space-y-2"
          style={{
            backgroundColor: 'rgba(16,185,129,0.08)',
            borderColor: 'rgba(16,185,129,0.2)',
          }}
        >
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <AlertCircle size={14} />
            Confirmar resolución
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            ¿Estás seguro de que este ticket está resuelto?
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmResolve}
              disabled={loading}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: '#10b981', color: '#ffffff' }}
            >
              {loading ? 'Guardando...' : 'Sí, resolver'}
            </button>
            <button
              onClick={() => setConfirming(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: 'var(--color-card)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.nextStatus}
            onClick={() => handleAction(action.nextStatus)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              backgroundColor: `rgba(var(--color-${action.color}), 0.1)`,
              border: `1px solid rgba(var(--color-${action.color}), 0.2)`,
              color: `var(--color-${action.color})`,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = `rgba(var(--color-${action.color}), 0.15)`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `rgba(var(--color-${action.color}), 0.1)`;
            }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Icon size={14} />
            )}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
