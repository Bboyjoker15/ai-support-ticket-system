'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Send,
  MessageCircle,
  Clock,
  Sparkles,
  User,
  Bot,
  CheckCircle,
  Mail,
} from 'lucide-react';

const statusConfig = {
  Open: { color: 'blue', label: 'Abierto' },
  'In Progress': { color: 'amber', label: 'En Progreso' },
  Resolved: { color: 'emerald', label: 'Resuelto' },
};

export default function UserTicketDetailPage() {
  const { id: ticketId } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorTicket, setErrorTicket] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!error && data) setComments(data);
  }, [ticketId]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authedUser } } = await supabase.auth.getUser();
      if (!authedUser) { router.push('/login'); return; }
      setUser(authedUser);
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (!ticketId) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: ticketData, error: tError } = await supabase
          .from('tickets').select('*').eq('id', ticketId).single();

        if (tError || !ticketData) { setErrorTicket(true); return; }
        setTicket(ticketData);
        await fetchComments();
      } catch { setErrorTicket(true); }
      finally { setLoading(false); }
    };
    load();
  }, [ticketId, fetchComments]);

  useEffect(() => {
    if (!ticketId) return;
    const canalComentarios = supabase
      .channel(`comentarios-usuario-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'comments',
        filter: `ticket_id=eq.${ticketId}`,
      }, () => fetchComments());

    const canalTicket = supabase
      .channel(`ticket-status-usuario-${ticketId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'tickets',
        filter: `id=eq.${ticketId}`,
      }, (payload) => setTicket(payload.new));

    canalComentarios.subscribe();
    canalTicket.subscribe();
    return () => {
      supabase.removeChannel(canalComentarios);
      supabase.removeChannel(canalTicket);
    };
  }, [ticketId, fetchComments]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || ticket?.status !== 'In Progress') return;

    const msg = newComment.trim();
    setNewComment('');
    setSending(true);

    try {
      const { error } = await supabase.from('comments').insert([{
        ticket_id: ticketId, user_id: user.id, message: msg,
      }]);
      if (error) throw error;
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  if (errorTicket || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={40} className="text-rose-500" strokeWidth={1.5} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          No se encontró este ticket.
        </p>
        <Link
          href="/dashboard/user"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}
        >
          <ArrowLeft size={14} />
          Volver
        </Link>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || { color: 'slate', label: ticket.status };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + Status */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/user"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ArrowLeft size={16} />
          Mis Tickets
        </Link>
        <span
          className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
          style={{
            backgroundColor: `rgba(var(--color-${status.color}), 0.1)`,
            borderColor: `rgba(var(--color-${status.color}), 0.2)`,
            color: `var(--color-${status.color})`,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Ticket Detail Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-6"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          {ticket.title}
        </h1>
        <p
          className="text-sm whitespace-pre-wrap leading-relaxed p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {ticket.description}
        </p>

        {/* AI Analysis if available */}
        {ticket.ai_analysis && (
          <div
            className="mt-4 p-4 rounded-xl border text-sm space-y-2"
            style={{
              backgroundColor: 'rgba(99,102,241,0.05)',
              borderColor: 'rgba(99,102,241,0.15)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-brand)' }}>
              <Sparkles size={14} />
              Análisis de IA
            </div>
            <p className="text-sm italic" style={{ color: 'var(--color-text-secondary)' }}>
              {ticket.ai_analysis}
            </p>
            {ticket.ai_suggested_reply && (
              <div
                className="mt-2 p-3 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
              >
                <strong>Respuesta sugerida:</strong> {ticket.ai_suggested_reply}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Chat */}
      <div
        className="rounded-2xl border flex flex-col"
        style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex items-center gap-2 px-6 py-4 border-b text-sm font-semibold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <MessageCircle size={16} style={{ color: 'var(--color-brand)' }} />
          Conversación
        </div>

        <div
          className="h-96 overflow-y-auto space-y-3 p-4"
          style={{ backgroundColor: 'var(--color-bg)' }}
        >
          {comments.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Mail size={32} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} className="mx-auto" />
                <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  No hay mensajes aún. El equipo revisará tu caso pronto.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {comments.map((comment) => {
                const isMine = comment.user_id === user?.id;
                return (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-sm ${
                      isMine
                        ? 'ml-auto rounded-tr-none'
                        : 'mr-auto rounded-tl-none'
                    }`}
                    style={{
                      backgroundColor: isMine ? 'var(--color-brand-muted)' : 'var(--color-card)',
                      border: isMine
                        ? '1px solid rgba(99,102,241,0.3)'
                        : '1px solid var(--color-border)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {isMine ? (
                        <User size={10} style={{ color: 'var(--color-brand)' }} />
                      ) : (
                        <Bot size={10} style={{ color: 'var(--color-text-muted)' }} />
                      )}
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        {isMine ? 'Tú' : 'Soporte'}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--color-text)' }}>
                      {comment.message}
                    </p>
                    <span className="text-[9px] mt-1 self-end font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(comment.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Chat Input Area */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {ticket.status === 'In Progress' ? (
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                required
                className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none transition-all duration-150"
                placeholder="Escribe tu mensaje..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{
                  backgroundColor: 'var(--color-bg)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-brand)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-brand)', color: '#ffffff' }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar
              </button>
            </form>
          ) : ticket.status === 'Open' ? (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-xs"
              style={{
                backgroundColor: 'rgba(59,130,246,0.05)',
                color: 'var(--color-text-muted)',
              }}
            >
              <Clock size={14} className="text-blue-400" />
              Esperando a que un agente atienda tu ticket...
            </div>
          ) : (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-xs"
              style={{
                backgroundColor: 'rgba(16,185,129,0.05)',
                color: 'var(--color-text-muted)',
              }}
            >
              <CheckCircle size={14} className="text-emerald-400" />
              Ticket resuelto. Si tienes otro problema, crea un nuevo ticket.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
