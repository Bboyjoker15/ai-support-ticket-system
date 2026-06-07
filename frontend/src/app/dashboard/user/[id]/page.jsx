'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function UserTicketDetailPage() {
  const { id: ticketId } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [errorTicket, setErrorTicket] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
  }, [ticketId]);

  // 1. Verificar Autenticación del Cliente
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authedUser } } = await supabase.auth.getUser();
      if (!authedUser) {
        router.push('/login');
        return;
      }
      setUser(authedUser);
    };
    checkUser();
  }, [router]);

  // 2. Cargar Ticket y Comentarios
  useEffect(() => {
    if (!ticketId) return;

    const loadTicketAndComments = async () => {
      setLoading(true);
      try {
        const { data: ticketData, error: tError } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', ticketId)
          .single();

        if (tError || !ticketData) {
          setErrorTicket(true);
          setLoading(false);
          return;
        }
        setTicket(ticketData);

        await fetchComments();
      } catch (err) {
        setErrorTicket(true);
      } finally {
        setLoading(false);
      }
    };

    loadTicketAndComments();
  }, [ticketId, fetchComments]);

  // 3. Escucha en tiempo real (Realtime) para Comentarios y cambios en el Ticket
  useEffect(() => {
    if (!ticketId) return;

    // Escucha de comentarios
    const canalComentarios = supabase
      .channel(`comentarios-usuario-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `ticket_id=eq.${ticketId}`
        },
        () => {
          fetchComments();
        }
      );

    // ✨ NUEVO: Escucha de cambios en el ticket (por si el agente lo atiende o resuelve en vivo)
    const canalTicket = supabase
      .channel(`ticket-status-usuario-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`
        },
        (payload) => {
          setTicket(payload.new);
        }
      );

    canalComentarios.subscribe();
    canalTicket.subscribe();

    return () => {
      supabase.removeChannel(canalComentarios);
      supabase.removeChannel(canalTicket);
    };
  }, [ticketId, fetchComments]);

  // 4. Enviar respuesta del cliente
  const handleSendComment = async (e) => {
    e.preventDefault();
    
    // 🛡️ CAPA 1: Solo se permite enviar mensajes si el ticket está estrictamente "In Progress"
    if (!newComment.trim() || !user || ticket?.status !== 'In Progress') return;

    const mensajeAEnviar = newComment.trim();
    setNewComment('');

    try {
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            ticket_id: ticketId,
            user_id: user.id, 
            message: mensajeAEnviar
          }
        ]);

      if (error) throw error;
    } catch (err) {
      alert('Error al enviar el mensaje: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <span className="text-sm text-slate-400 animate-pulse">Cargando el estado de tu solicitud...</span>
      </div>
    );
  }

  if (errorTicket || !ticket) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-rose-400 font-medium">No se pudo encontrar la información de este ticket.</p>
        <Link href="/dashboard/user" className="text-sm bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition">
          Volver a mis solicitudes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <Link href="/dashboard/user" className="text-sm text-slate-400 hover:text-indigo-400 transition font-medium">
            ⬅ Volver a Mis Tickets
          </Link>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
            ticket.status === 'Open' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
            ticket.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
            'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            Status: {ticket.status}
          </span>
        </div>

        {/* Información del Ticket */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h1 className="text-xl font-bold text-white mb-2">{ticket.title}</h1>
          <p className="text-slate-300 text-sm bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        {/* Chat interactivo en Tiempo Real */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
            💬 Conversación con Soporte Técnico
          </h2>

          <div className="h-80 overflow-y-auto space-y-3 mb-4 p-2 bg-slate-950/50 rounded-xl border border-slate-800/80 pr-3 scrollbar-thin">
            {comments.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <p className="text-xs text-slate-500 italic">No hay mensajes aún. Nuestro equipo técnico evaluará tu caso pronto.</p>
              </div>
            ) : (
              comments.map((comment) => {
                const esMiMensaje = comment.user_id === user?.id;
                return (
                  <div 
                    key={comment.id} 
                    className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-sm transition-all duration-150 ${
                      esMiMensaje 
                        ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 ml-auto text-indigo-100 rounded-tr-none' 
                        : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 mr-auto rounded-tl-none'
                    }`}
                  >
                    <span className="text-[9px] font-mono opacity-50 mb-1">
                      {esMiMensaje ? 'Tú (Cliente)' : 'Soporte Técnico'}
                    </span>
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{comment.message}</p>
                    <span className="text-[8px] opacity-40 mt-1 self-end font-mono">
                      {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* 🛡️ CAPA 2: Control de UI Basado en Tres Estados de Flujo */}
          {ticket.status === 'Open' && (
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-1.5 animate-pulse">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                ⏳ Esperando por un agente que atienda el caso
              </span>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Tu solicitud ya está en el sistema. En cuanto uno de nuestros ingenieros de soporte la tome, esta sala de chat se desbloqueará de inmediato.
              </p>
            </div>
          )}

          {ticket.status === 'In Progress' && (
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                required
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                placeholder="Escribe un mensaje o añade más detalles sobre tu problema..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl text-sm uppercase tracking-wider transition active:scale-95"
              >
                Responder
              </button>
            </form>
          )}

          {ticket.status === 'Resolved' && (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-1.5">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                🎉 Solicitud Resuelta y Concluida
              </span>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Esta sección se ha archivado automáticamente porque el inconveniente fue solucionado. Si experimentas un nuevo problema, por favor abre un reporte diferente.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}