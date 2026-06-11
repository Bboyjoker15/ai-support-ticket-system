'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bell } from 'lucide-react';

export default function UserNotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Cargar alertas locales previas del usuario
  useEffect(() => {
    if (userId && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`user_notifications_${userId}`);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    }
  }, [userId]);

  // Suscripción en tiempo real a cambios de estado en sus tickets
  useEffect(() => {
    if (!userId) return;

    const canalUsuario = supabase
      .channel(`alertas-usuario-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        (payload) => {
          const ticketModificado = payload.new;

          // Guardrail: Ignorar por completo si el ticket no pertenece a este usuario
          if (ticketModificado.user_id !== userId) return;

          const estadoAnterior = payload.old?.status;
          const estadoNuevo = ticketModificado.status;

          // Validar si hubo un cambio real en el estado del ticket
          if (estadoAnterior !== estadoNuevo) {
            setNotifications((prev) => {
              // Evitar alertas duplicadas del mismo evento
              if (prev.some((n) => n.event_id === `${ticketModificado.id}-${estadoNuevo}`)) return prev;

              const nuevaAlerta = {
                id: Date.now(),
                event_id: `${ticketModificado.id}-${estadoNuevo}`,
                ticket_id: ticketModificado.id,
                title: ticketModificado.title,
                status: estadoNuevo,
                message: `Tu requerimiento cambió de estado a: ${estadoNuevo}`,
                created_at: new Date().toISOString(),
              };

              const updated = [nuevaAlerta, ...prev];
              if (typeof window !== 'undefined') {
                localStorage.setItem(`user_notifications_${userId}`, JSON.stringify(updated));
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(canalUsuario);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userId]);

  const handleClearAll = () => {
    setNotifications([]);
    if (userId && typeof window !== 'undefined') {
      localStorage.removeItem(`user_notifications_${userId}`);
    }
  };

  const handleNotificationClick = (notif) => {
    const updated = notifications.filter((n) => n.id !== notif.id);
    setNotifications(updated);
    if (userId && typeof window !== 'undefined') {
      localStorage.setItem(`user_notifications_${userId}`, JSON.stringify(updated));
    }
    setIsOpen(false);
    
    // Redirección directa al detalle del ticket en la vista del usuario
    router.push(`/dashboard/user/${notif.ticket_id}`);
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Campana de Usuario */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl transition focus:outline-none"
        style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
      >
        <Bell size={24} />

        {/* Globo indicador naranja/ámbar para alertar cambios del sistema */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 ring-2 ring-slate-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
            <h3 className="text-sm font-bold text-white tracking-wide">Actualizaciones</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] bg-slate-800 text-slate-400 hover:text-amber-400 px-2 py-1 rounded font-medium border border-slate-700 transition"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 italic">
                Sin novedades en tus solicitudes.
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotificationClick(notif)}
                  className="w-full p-4 transition text-left block focus:outline-none hover:bg-slate-950/40"
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                      notif.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      notif.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {notif.status}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 truncate mt-1">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}