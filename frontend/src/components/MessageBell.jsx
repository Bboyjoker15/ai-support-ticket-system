'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MessageBell({ userId, userRole, assignedTicketIds = [] }) {
  const [chatNotifications, setChatNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Cargar chats no leídos locales al montar
  useEffect(() => {
    if (userId && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`unread_chats_${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTimeout(() => {
          setChatNotifications(parsed);
        }, 0);
      }
    }
  }, [userId]);

  // Suscripción en tiempo real a la tabla 'comments'
  useEffect(() => {
    if (!userId || userRole !== 'agent' || assignedTicketIds.length === 0) return;

    const canalMensajes = supabase
      .channel('chats-tiempo-real')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          const newComment = payload.new;

          // Ignorar si el mensaje lo escribiste tú mismo
          if (newComment.user_id === userId) return;

          // Validar si el mensaje pertenece a uno de tus tickets asignados
          if (assignedTicketIds.includes(newComment.ticket_id)) {
            setChatNotifications((prev) => {
              if (prev.some((c) => c.id === newComment.id)) return prev;

              const updated = [
                {
                  id: newComment.id,
                  ticket_id: newComment.ticket_id,
                  message: newComment.message, // Columna 'message' de tu SQL
                  created_at: newComment.created_at,
                },
                ...prev,
              ];

              if (typeof window !== 'undefined') {
                localStorage.setItem(`unread_chats_${userId}`, JSON.stringify(updated));
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
  }, [userId, userRole, assignedTicketIds]);

  const handleClearAll = () => {
    setChatNotifications([]);
    if (userId && typeof window !== 'undefined') {
      localStorage.removeItem(`unread_chats_${userId}`);
    }
  };

  const handleChatClick = (chat) => {
    const updated = chatNotifications.filter((c) => c.id !== chat.id);
    setChatNotifications(updated);
    if (userId && typeof window !== 'undefined') {
      localStorage.setItem(`unread_chats_${userId}`, JSON.stringify(updated));
    }
    setIsOpen(false);
    router.push(`/dashboard/agent/${chat.ticket_id}`);
  };

  const unreadCount = chatNotifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón del Chat / Mensajes */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition focus:outline-none"
      >
        {/* Ícono de mensaje/burbuja de chat */}
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>

        {/* Globo indicador azul/celeste para diferenciarlo de las alertas críticas */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white ring-2 ring-slate-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable de Mensajes */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
            <h3 className="text-sm font-bold text-white tracking-wide">Mensajes del Canal</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] bg-slate-800 text-slate-400 hover:text-sky-400 px-2 py-1 rounded font-medium border border-slate-700 transition"
              >
                Limpiar todo
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {chatNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 italic">
                No tienes mensajes nuevos sin leer.
              </div>
            ) : (
              chatNotifications.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => handleChatClick(chat)}
                  className="w-full p-4 transition text-left block focus:outline-none hover:bg-slate-950/40"
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Ticket: {chat.ticket_id ? chat.ticket_id.slice(0, 8) : '...'}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed italic">
                    {`"${chat.message}"`}
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