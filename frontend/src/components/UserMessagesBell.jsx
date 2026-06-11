'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MessageSquare } from 'lucide-react';

export default function UserMessagesBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Cargar chats pendientes previos guardados localmente
  useEffect(() => {
    if (userId && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`user_chat_notifications_${userId}`);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    }
  }, [userId]);

  // Suscripción en tiempo real a la tabla de comentarios (mensajes del chat)
  useEffect(() => {
    if (!userId) return;

    const canalMensajes = supabase
      .channel(`chat-usuario-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' }, // 👈 CORREGIDO: Escucha en 'comments'
        async (payload) => {
          const nuevoMensaje = payload.new;

          // Guardrail 1: Si el mensaje lo enviaste tú mismo, se ignora por completo
          if (nuevoMensaje.user_id === userId) return; // 👈 CORREGIDO: Usa 'user_id' en vez de 'sender_id'

          // Guardrail 2: Validar si el ticket de este mensaje te pertenece a ti
          const { data: ticket, error } = await supabase
            .from('tickets')
            .select('title, user_id')
            .eq('id', nuevoMensaje.ticket_id)
            .single();

          if (error || !ticket) return;

          // Si el ticket es genuinamente tuyo, guardamos la alerta de chat
          if (ticket.user_id === userId) {
            setNotifications((prev) => {
              // Evitar duplicados por seguridad de re-render
              if (prev.some((n) => n.message_id === nuevoMensaje.id)) return prev;

              const nuevaAlerta = {
                id: Date.now(),
                message_id: nuevoMensaje.id,
                ticket_id: nuevoMensaje.ticket_id,
                ticket_title: ticket.title,
                content: nuevoMensaje.message, // 👈 CORREGIDO: Extrae de '.message' en vez de '.content'
                created_at: nuevoMensaje.created_at || new Date().toISOString(),
              };

              const updated = [nuevaAlerta, ...prev];
              if (typeof window !== 'undefined') {
                localStorage.setItem(`user_chat_notifications_${userId}`, JSON.stringify(updated));
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
      supabase.removeChannel(canalMensajes);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userId]);

  const handleClearAll = () => {
    setNotifications([]);
    if (userId && typeof window !== 'undefined') {
      localStorage.removeItem(`user_chat_notifications_${userId}`);
    }
  };

  const handleNotificationClick = (notif) => {
    // Filtramos para quitar la notificación clickeada
    const updated = notifications.filter((n) => n.id !== notif.id);
    setNotifications(updated);
    if (userId && typeof window !== 'undefined') {
      localStorage.setItem(`user_chat_notifications_${userId}`, JSON.stringify(updated));
    }
    setIsOpen(false);
    
    // Redirección directa al chat específico del ticket
    router.push(`/dashboard/user/${notif.ticket_id}`);
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de Mensajes (Ícono de Chat) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl transition focus:outline-none"
        style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
      >
        <MessageSquare size={24} />

        {/* Indicador azul para mensajes nuevos */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white ring-2 ring-slate-950">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
            <h3 className="text-sm font-bold text-white tracking-wide">Mensajes Nuevos</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] bg-slate-800 text-slate-400 hover:text-blue-400 px-2 py-1 rounded font-medium border border-slate-700 transition"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 italic">
                No tienes mensajes nuevos sin leer.
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
                    <span className="text-[10px] font-semibold text-blue-400 truncate max-w-[180px]">
                      {notif.ticket_title}
                    </span>
                    <span className="text-[10px] text-slate-600 shrink-0">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-medium line-clamp-2">
                    {notif.content}
                  </p>
                  <span className="text-[9px] text-slate-500 block mt-2 hover:underline">
                    Responder chat →
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}