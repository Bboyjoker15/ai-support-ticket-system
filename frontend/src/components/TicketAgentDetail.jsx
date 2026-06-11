'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Send,
  MessageCircle,
  Sparkles,
  User,
  Bot,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import TicketAgentActions from './TicketAgentActions';

const statusConfig = {
  Open: { color: 'blue', label: 'Abierto' },
  'In Progress': { color: 'amber', label: 'En Progreso' },
  Resolved: { color: 'emerald', label: 'Resuelto' },
};

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
  const accentColor = isAdmin ? 'purple' : 'amber';

  useEffect(() => {
    if (isAdmin) localStorage.setItem('admin_view_mode', 'agent');
  }, [isAdmin]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: authedUser } } = await supabase.auth.getUser();
      if (!authedUser) { router.push('/login'); return; }
      setUser(authedUser);
    };
    checkUser();
  }, [router]);

  const loadTicket = async () => {
    const { data: ticketData, error: tError } = await supabase
      .from('tickets').select('*').eq('id', ticketId).single();

    if (tError || !ticketData) { setErrorTicket(true); return null; }
    setTicket(ticketData);
    return ticketData;
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });

    if (!error && data) setComments(data);
  };

  useEffect(() => {
    if (!ticketId) return;
    const init = async () => {
      setLoading(true);
      try {
        await loadTicket();
        await fetchComments();
      } catch { setErrorTicket(true); }
      finally { setLoading(false); }
    };
    init();
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    const canalCom = supabase
      .channel(`comentarios-${variant}-${ticketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `ticket_id=eq.${ticketId}` }, () => fetchComments());
    const canalTick = supabase
      .channel(`ticket-status-${variant}-${ticketId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` }, (payload) => setTicket(payload.new));

    canalCom.subscribe();
    canalTick.subscribe();
    return () => { supabase.removeChannel(canalCom); supabase.removeChannel(canalTick); };
  }, [ticketId, variant]);

  const handleUpdateStatus = async (newStatus) => {
    if (!user || !ticket) return;
    setStatusLoading(true);
    const shouldAssign = newStatus === 'In Progress';
    const updateData = { status: newStatus };
    if (shouldAssign) updateData.assigned_to = user.id;

    try {
      const { error } = await supabase.from('tickets').update(updateData).eq('id', ticketId);
      if (error) throw error;
      await loadTicket();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    const msg = newComment.trim();
    setNewComment('');
    try {
      const { error } = await supabase.from('comments').insert([{ ticket_id: ticketId, user_id: user.id, message: msg }]);
      if (error) throw error;
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleBack = () => {
    if (isAdmin) {
      localStorage.setItem('admin_view_mode', searchParams.get('from') === 'tickets' ? 'admin' : 'agent');
      if (searchParams.get('from') === 'tickets') sessionStorage.setItem('admin_section', 'tickets');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-brand)' }} /></div>;
  }

  if (errorTicket || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={40} className="text-rose-500" strokeWidth={1.5} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Ticket no encontrado.
        </p>
        <Link href={backHref} onClick={handleBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}>
          <ArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || { color: 'slate', label: ticket.status };
  const assignedToMe = ticket.assigned_to === user?.id;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + Status + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link href={backHref} onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}>
          <ArrowLeft size={16} />
          {isAdmin ? 'Panel Admin' : 'Mesa de Agente'}
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(168,85,247,0.1)', color: '#a78bfa' }}>
              Vista Admin
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
            style={{
              backgroundColor: `rgba(var(--color-${status.color}), 0.1)`,
              borderColor: `rgba(var(--color-${status.color}), 0.2)`,
              color: `var(--color-${status.color})`,
            }}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Assignment info */}
      {assignedToMe && (
        <div className="p-3 rounded-xl text-xs border" style={{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
          Este ticket está asignado a ti.
        </div>
      )}
      {ticket.assigned_to && !assignedToMe && (
        <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
          Asignado a otro agente. Puedes tomarlo con &quot;Atender&quot;.
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Ticket detail */}
        <div className="lg:col-span-3 space-y-6">
          {/* Ticket info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-6"
            style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <span className="text-xs font-mono block mb-1" style={{ color: 'var(--color-text-muted)' }}>ID: {ticket.id}</span>
            <h1 className="text-xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>{ticket.title}</h1>
            <p className="text-sm whitespace-pre-wrap leading-relaxed p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
              {ticket.description}
            </p>

            {/* AI fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              {[
                { label: 'Prioridad', value: ticket.ai_priority || 'No analizado', color: 'rose' },
                { label: 'Riesgo', value: ticket.ai_risk_level || 'No analizado', color: 'orange' },
                { label: 'Clasificación', value: ticket.ai_classification || 'No analizado', color: 'indigo' },
              ].map((field) => (
                <div key={field.label} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <span className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {field.label}
                  </span>
                  <span className="text-sm font-bold" style={{ color: `var(--color-${field.color})` }}>
                    {field.value}
                  </span>
                </div>
              ))}
            </div>

            {ticket.ai_summary && (
              <div className="mt-4 p-4 rounded-xl text-sm space-y-1" style={{ backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-brand)' }}>
                  <Sparkles size={12} /> Resumen IA
                </div>
                <p className="italic text-sm" style={{ color: 'var(--color-text-secondary)' }}>{ticket.ai_summary}</p>
              </div>
            )}
          </motion.div>

          {/* Chat */}
          <div className="rounded-2xl border flex flex-col" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 px-6 py-4 border-b text-sm font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
              <MessageCircle size={16} style={{ color: 'var(--color-brand)' }} />
              Conversación con el cliente
            </div>

            <div className="h-96 overflow-y-auto space-y-3 p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
              {comments.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sin mensajes aún.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {comments.map((comment) => {
                    const isStaff = comment.user_id === user?.id;
                    const isClient = comment.user_id === ticket.user_id;
                    return (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex flex-col max-w-[85%] rounded-2xl p-3 text-sm ${isStaff ? 'ml-auto rounded-tr-none' : 'mr-auto rounded-tl-none'}`}
                        style={{
                          backgroundColor: isStaff ? 'var(--color-brand-muted)' : 'var(--color-card)',
                          border: isStaff ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--color-border)',
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {isStaff ? <User size={10} style={{ color: 'var(--color-brand)' }} /> : isClient ? <Bot size={10} style={{ color: 'var(--color-text-muted)' }} /> : null}
                          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            {isStaff ? (isAdmin ? 'Tú (Admin)' : 'Tú (Agente)') : isClient ? 'Cliente' : 'Soporte'}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--color-text)' }}>{comment.message}</p>
                        <span className="text-[9px] mt-1 self-end font-mono" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(comment.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* AI suggested reply */}
            {ticket.ai_suggested_reply && (
              <div className="mx-4 my-2 p-4 rounded-xl text-xs space-y-2" style={{ backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase" style={{ color: 'var(--color-brand)' }}>Sugerencia IA</span>
                  <button
                    onClick={() => setNewComment(ticket.ai_suggested_reply)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ backgroundColor: 'var(--color-brand)', color: '#ffffff' }}
                  >
                    Insertar
                  </button>
                </div>
                <p className="italic" style={{ color: 'var(--color-text-secondary)' }}>{ticket.ai_suggested_reply}</p>
              </div>
            )}

            {/* Chat input */}
            <form onSubmit={handleSendComment} className="flex gap-2 p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <input
                type="text"
                required
                className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none transition-all"
                placeholder="Escribe tu respuesta..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-brand)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ backgroundColor: 'var(--color-brand)', color: '#ffffff' }}
              >
                <Send size={14} />
                Enviar
              </button>
            </form>
          </div>
        </div>

        {/* Right sidebar: Actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Acciones
            </h3>
            <TicketAgentActions
              ticket={ticket}
              onStatusChange={handleUpdateStatus}
              loading={statusLoading}
            />
          </div>

          {/* Ticket metadata */}
          <div className="rounded-2xl border p-5 space-y-3" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
              Detalles
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Creado</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{new Date(ticket.created_at).toLocaleDateString('es')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Cliente</span>
                <span className="truncate ml-2" style={{ color: 'var(--color-text-secondary)' }}>{ticket.user_id?.slice(0, 8)}...</span>
              </div>
              {ticket.ai_latency && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Latencia IA</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{ticket.ai_latency}ms</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
