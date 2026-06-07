'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function TicketAgentDetail({ variant = 'agent' }) {
  const { id: ticketId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = variant === 'admin';

  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorTicket, setErrorTicket] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const backHref = isAdmin ? '/dashboard/admin' : '/dashboard/agent';
  const backLabel = isAdmin
    ? 'Volver al panel de administración'
    : 'Volver a la mesa de operaciones';
  const accentHover = isAdmin ? 'hover:text-purple-400' : 'hover:text-amber-400';
  const accentBtn = isAdmin
    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600';
  const staffLabel = isAdmin ? 'Tú (Administrador)' : 'Tú (Agente Técnico)';

  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('admin_view_mode', 'agent');
    }
  }, [isAdmin]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user: authedUser },
      } = await supabase.auth.getUser();
      if (!authedUser) {
        router.push('/login');
        return;
      }
      setUser(authedUser);
    };
    checkUser();
  }, [router]);

  const loadTicket = async () => {
    const { data: ticketData, error: tError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (tError || !ticketData) {
      setErrorTicket(true);
      return null;
    }
    setTicket(ticketData);
    return ticketData;
  };

  useEffect(() => {
    if (!ticketId) return;

    const init = async () => {
      setLoading(true);
      setErrorTicket(false);
      try {
        await loadTicket();
        await fetchComments();
      } catch {
        setErrorTicket(true);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;

    const canalComentarios = supabase
      .channel(`comentarios-ticket-${variant}-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => fetchComments()
      );

    const canalTicket = supabase
      .channel(`ticket-status-${variant}-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`,
        },
        (payload) => setTicket(payload.new)
      );

    canalComentarios.subscribe();
    canalTicket.subscribe();

    return () => {
      supabase.removeChannel(canalComentarios);
      supabase.removeChannel(canalTicket);
    };
  }, [ticketId, variant]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) setComments(data);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!user || !ticket) return;
    setStatusLoading(true);

    const shouldAssign = newStatus === 'In Progress';
    const updateData = { status: newStatus };
    if (shouldAssign) updateData.assigned_to = user.id;

    try {
      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
      await loadTicket();
    } catch (err) {
      alert('No se pudo actualizar el ticket: ' + err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const mensajeAEnviar = newComment.trim();
    setNewComment('');

    try {
      const { error } = await supabase.from('comments').insert([
        {
          ticket_id: ticketId,
          user_id: user.id,
          message: mensajeAEnviar,
        },
      ]);

      if (error) throw error;
    } catch (err) {
      alert('Error al enviar el mensaje: ' + err.message);
    }
  };

  const handleBack = () => {
    if (isAdmin) {
      localStorage.setItem('admin_view_mode', searchParams.get('from') === 'tickets' ? 'admin' : 'agent');
      if (searchParams.get('from') === 'tickets') {
        sessionStorage.setItem('admin_section', 'tickets');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col gap-4 items-center justify-center text-white">
        <svg
          className={`animate-spin h-8 w-8 ${isAdmin ? 'text-purple-500' : 'text-amber-500'}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-slate-400 animate-pulse">Abriendo expediente del ticket...</span>
      </div>
    );
  }

  if (errorTicket || !ticket) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center gap-4">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center max-w-md">
          <p className="text-rose-400 font-medium">
            El ticket no existe o no tienes permisos para verlo.
          </p>
        </div>
        <Link
          href={backHref}
          onClick={handleBack}
          className="text-sm bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition"
        >
          {backLabel}
        </Link>
      </div>
    );
  }

  const assignedToMe = ticket.assigned_to === user?.id;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <Link
            href={backHref}
            onClick={handleBack}
            className={`flex items-center gap-2 text-sm text-slate-400 ${accentHover} transition font-medium`}
          >
            <span>⬅</span> {backLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Vista admin
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                ticket.status === 'Open'
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : ticket.status === 'In Progress'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              {ticket.status}
            </span>
          </div>
        </div>

        {assignedToMe && (
          <p className="text-xs text-emerald-400/90 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2">
            Este ticket está asignado a ti.
          </p>
        )}

        {ticket.assigned_to && !assignedToMe && (
          <p className="text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            Asignado a otro usuario (ID: {ticket.assigned_to.slice(0, 8)}…). Puedes tomarlo con
            &quot;Atender&quot;.
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          {ticket.status === 'Open' && (
            <button
              type="button"
              disabled={statusLoading}
              onClick={() => handleUpdateStatus('In Progress')}
              className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-500/20 disabled:opacity-50"
            >
              {statusLoading ? 'Guardando…' : 'Atender y asignarme'}
            </button>
          )}
          {ticket.status === 'In Progress' && (
            <button
              type="button"
              disabled={statusLoading}
              onClick={() => handleUpdateStatus('Resolved')}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {statusLoading ? 'Guardando…' : 'Marcar como resuelto'}
            </button>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <span className="text-xs font-mono text-slate-500 block mb-1">ID: {ticket.id}</span>
          <h1 className="text-2xl font-bold text-white mb-3">{ticket.title}</h1>
          <p className="text-slate-300 text-sm p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/50">
            <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Prioridad
              </span>
              <span className="text-sm font-bold text-rose-400">
                {ticket.ai_priority || 'No analizado'}
              </span>
            </div>
            <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Riesgo
              </span>
              <span className="text-sm font-bold text-orange-400">
                {ticket.ai_risk_level || 'No analizado'}
              </span>
            </div>
            <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40">
              <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Clasificación
              </span>
              <span className="text-sm font-bold text-indigo-400">
                {ticket.ai_classification || 'No analizado'}
              </span>
            </div>
          </div>

          {ticket.ai_summary && (
            <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <strong className="text-xs text-amber-400 uppercase font-semibold block mb-1">
                Resumen IA
              </strong>
              <p className="text-xs text-slate-400 italic">{ticket.ai_summary}</p>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-3">
            Canal de comunicación
          </h2>

          <div className="h-80 overflow-y-auto space-y-3 mb-4 p-2 bg-slate-950/50 rounded-xl border border-slate-800/80">
            {comments.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <p className="text-xs text-slate-500 italic">Sin mensajes aún.</p>
              </div>
            ) : (
              comments.map((comment) => {
                const esStaff = comment.user_id === user?.id;
                const esCliente = comment.user_id === ticket.user_id;
                return (
                  <div
                    key={comment.id}
                    className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-sm ${
                      esStaff
                        ? `ml-auto border rounded-tr-none ${
                            isAdmin
                              ? 'bg-purple-500/20 border-purple-500/30 text-purple-100'
                              : 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-orange-500/30 text-amber-100'
                          }`
                        : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 mr-auto rounded-tl-none'
                    }`}
                  >
                    <span className="text-[9px] font-mono opacity-50 mb-1">
                      {esStaff ? staffLabel : esCliente ? 'Cliente' : 'Soporte / Otro'}
                    </span>
                    <p className="whitespace-pre-wrap break-words">{comment.message}</p>
                    <span className="text-[8px] opacity-40 mt-1 self-end font-mono">
                      {new Date(comment.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {ticket.ai_suggested_reply && (
            <div className="mb-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase text-indigo-400">
                  Sugerencia IA
                </span>
                <button
                  type="button"
                  onClick={() => setNewComment(ticket.ai_suggested_reply)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold"
                >
                  Insertar en el chat
                </button>
              </div>
              <p className="text-xs text-slate-300 italic">{ticket.ai_suggested_reply}</p>
            </div>
          )}

          <form onSubmit={handleSendComment} className="flex gap-2">
            <input
              type="text"
              required
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              placeholder="Respuesta técnica para el usuario..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              className={`${accentBtn} text-white font-bold px-5 py-3 rounded-xl text-sm uppercase tracking-wider`}
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
