'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NotificationBell({
  ticketLinkPrefix = '/dashboard/agent',
}) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Contar cuántas notificaciones críticas no se han leído
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Filtrar cuáles notificaciones ya tienen su ticket en estado "Resolved" o "Resuelto"
  const resolvedNotifications = notifications.filter(notif => {
    // Salvaguarda estricta por si la relación relacional tarda en resolver en BD
    const status = notif.tickets?.status || notif.ticket_status;
    return status?.toLowerCase() === 'resolved' || status?.toLowerCase() === 'resuelto';
  });

  const hasResolved = resolvedNotifications.length > 0;

  useEffect(() => {
    fetchNotifications();

    // 🔔 1. Suscripción a nuevas notificaciones
    const canalNotificaciones = supabase
      .channel('notificaciones-tiempo-real')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    // 🔄 2. Suscripción a cambios en Tickets (para captar el cambio a "Resolved" en vivo)
    const canalTickets = supabase
      .channel('tickets-actualizaciones-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        () => {
          fetchNotifications(); // Re-calcula los estados de los tickets asociados
        }
      )
      .subscribe();

    // Cerrar el menú si hacen clic fuera de él
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(canalNotificaciones);
      supabase.removeChannel(canalTickets);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          tickets:ticket_id ( status )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) {
        // Mapeo preventivo para asegurar que el objeto tickets siempre exista
        const completas = data.map(n => ({
          ...n,
          tickets: n.tickets ? n.tickets : { status: 'open' }
        }));
        setNotifications(completas);
      }
    } catch (err) {
      console.error('Error cargando notificaciones:', err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;
      fetchNotifications();
    } catch (err) {
      console.error('Error al marcar como leídas:', err.message);
    }
  };

  // 🔥 Función estricta optimizada (Borra localmente primero y luego impacta la BD)
  const handleClearResolved = async () => {
    const idsAEliminar = resolvedNotifications.map(n => n.id);
    if (idsAEliminar.length === 0) return;

    // Respaldamos el estado actual por si la transacción falla en Supabase
    const backupAnterior = [...notifications];

    // 1️⃣ UI Optimista: Las barremos de inmediato de la vista para evitar el parpadeo fantasma
    setNotifications(prev => prev.filter(n => !idsAEliminar.includes(n.id)));

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', idsAEliminar);

      if (error) {
        // Si hubo un error real (ej. políticas RLS), revertimos el estado local
        setNotifications(backupAnterior);
        alert(`Supabase rechazó el borrado de las alertas: ${error.message}`);
        throw error;
      }
    } catch (err) {
      console.error('Error al limpiar alertas resueltas:', err.message);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de la Campana */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            markAllAsRead();
          }
        }}
        className="relative p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition focus:outline-none"
      >
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Globo indicador rojo */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-slate-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
            <h3 className="text-sm font-bold text-white tracking-wide">Alertas Críticas</h3>
            
            {/* 🛠️ Botón dinámico: Solo aparece si hay notificaciones con tickets resueltos */}
            {hasResolved ? (
              <button
                onClick={handleClearResolved}
                className="text-[10px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2 py-1 rounded font-semibold border border-emerald-500/30 transition"
              >
                Limpiar resueltas
              </button>
            ) : unreadCount > 0 ? (
              <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-medium border border-rose-500/20">
                Nuevas
              </span>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 italic">
                No hay alertas registradas por el momento.
              </div>
            ) : (
              notifications.map((notif) => {
                const isTicketResolved = 
                  notif.tickets?.status?.toLowerCase() === 'resolved' || 
                  notif.tickets?.status?.toLowerCase() === 'resuelto';

                return (
                  <button 
                    key={notif.id} 
                    type="button"
                    onClick={() => {
                      const targetTicketId = notif.ticket_id || notif.id_ticket;
                      if (targetTicketId) {
                        router.push(`${ticketLinkPrefix}/${targetTicketId}`);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full p-4 transition text-left block focus:outline-none focus:bg-slate-800/40 ${
                      notif.priority === 'High' ? 'bg-rose-500/5 hover:bg-rose-500/10' : 'hover:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          notif.priority === 'High' 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {notif.priority} Risk
                        </span>

                        {/* 🟢 Indicador visual de que el ticket YA está resuelto */}
                        {isTicketResolved && (
                          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Resuelto
                          </span>
                        )}
                      </div>
                      
                      <span className="text-[10px] text-slate-600">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate">{notif.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed italic">
                      {notif.message}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}