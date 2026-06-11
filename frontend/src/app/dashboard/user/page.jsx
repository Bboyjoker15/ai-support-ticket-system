'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
  Sparkles,
  MessageCircle,
  Bell,
  ArrowRight,
  Plus,
} from 'lucide-react';
import UserNotificationBell from '@/components/UserNotificationBell';
import UserMessagesBell from '@/components/UserMessagesBell';

const statusColors = {
  Open: 'blue',
  'In Progress': 'amber',
  Resolved: 'emerald',
};

function StatusBadge({ status }) {
  const color = statusColors[status] || 'slate';
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
      style={{
        backgroundColor: `rgba(var(--color-${color}), 0.1)`,
        borderColor: `rgba(var(--color-${color}), 0.2)`,
        color: `var(--color-${color})`,
      }}
    >
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `rgba(var(--color-${color}), 0.1)` }}
        >
          <Icon size={20} style={{ color: `var(--color-${color})` }} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {value}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [tickets, setTickets] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  // New ticket form visibility
  const [showForm, setShowForm] = useState(false);

  const fetchTickets = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) setFetchError(true);
      else if (data) {
        setTickets(data);
        setFetchError(false);
      }
    } catch {
      setFetchError(true);
    }
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user: authedUser }, error } = await supabase.auth.getUser();
        if (error || !authedUser) {
          router.push('/login');
          return;
        }
        setUser(authedUser);
        fetchTickets(authedUser.id);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [router, fetchTickets]);

  useEffect(() => {
    if (!user?.id) return;
    const canal = supabase
      .channel('cambios-tickets-user')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tickets',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchTickets(user.id));

    canal.subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [user?.id, fetchTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setFormLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.from('tickets').insert([{
        user_id: user.id, title, description, status: 'Open',
      }]);

      if (error) throw error;

      setMessage({ text: 'Incidencia enviada correctamente. La IA está analizando la prioridad.', type: 'success' });
      setTitle('');
      setDescription('');
      fetchTickets(user.id);
      setShowForm(false);
    } catch (error) {
      setMessage({ text: error.message || 'Error al enviar el ticket.', type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter === 'All') return true;
    return ticket.status === statusFilter;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-brand)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Ticket} label="Total Tickets" value={stats.total} color="indigo" />
        <StatCard icon={Clock} label="Abiertos" value={stats.open} color="blue" />
        <StatCard icon={MessageCircle} label="En Progreso" value={stats.inProgress} color="amber" />
        <StatCard icon={CheckCircle2} label="Resueltos" value={stats.resolved} color="emerald" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* New Ticket Section */}
        <div className="lg:col-span-2">
          {!showForm ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setShowForm(true)}
              className="w-full rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 transition-all duration-200 cursor-pointer group"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-card)',
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--color-brand-muted)' }}
              >
                <Plus size={28} style={{ color: 'var(--color-brand)' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Nuevo Ticket
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Reporta un problema técnico
              </span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border p-6"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                  Reportar Incidencia
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-sm px-3 py-1 rounded-lg"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Cancelar
                </button>
              </div>

              <AnimatePresence>
                {message.text && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-3 rounded-xl text-sm border flex items-start gap-2"
                    style={{
                      backgroundColor: message.type === 'success'
                        ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                      borderColor: message.type === 'success'
                        ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                      color: message.type === 'success' ? '#10b981' : '#f43f5e',
                    }}
                  >
                    {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <p>{message.text}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Asunto
                  </label>
                  <input
                    type="text"
                    required
                    disabled={formLoading}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Falla crítica en autenticación"
                    className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-all duration-150"
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-brand)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                    Descripción
                  </label>
                  <textarea
                    required
                    rows={5}
                    disabled={formLoading}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe detalladamente qué sucede..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition-all duration-150 resize-none"
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-brand)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-brand)', color: '#ffffff' }}
                  onMouseEnter={(e) => !formLoading && (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => !formLoading && (e.currentTarget.style.opacity = '1')}
                >
                  {formLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Analizando con IA...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Enviar Ticket
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </div>

        {/* Tickets List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              Mis Tickets
            </h2>
            <div className="flex items-center gap-2">
              <UserNotificationBell userId={user?.id} />
              <UserMessagesBell userId={user?.id} />
            </div>
          </div>

          {/* Filter tabs */}
          <div
            className="flex flex-wrap gap-1 p-1 rounded-xl border w-fit"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border)',
            }}
          >
            {['All', 'Open', 'In Progress', 'Resolved'].map((filter) => {
              const active = statusFilter === filter;
              const count = filter === 'All' ? tickets.length : tickets.filter(t => t.status === filter).length;
              return (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 uppercase"
                  style={{
                    backgroundColor: active ? 'var(--color-card)' : 'transparent',
                    color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {filter === 'All' ? 'Todos' : filter} ({count})
                </button>
              );
            })}
          </div>

          {/* Ticket cards */}
          {fetchError ? (
            <div
              className="rounded-2xl border p-6 text-center text-sm"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: '#f43f5e',
              }}
            >
              No se pudieron cargar tus tickets. Refresca la página.
            </div>
          ) : tickets.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed p-16 flex flex-col items-center justify-center text-center"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              <FileText size={40} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
              <p className="mt-4 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                No tienes tickets registrados
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Crea tu primer ticket para recibir soporte técnico
              </p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed p-12 text-center text-sm"
              style={{
                backgroundColor: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              No hay tickets en estado &quot;{statusFilter === 'All' ? 'Todos' : statusFilter}&quot;
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredTickets.map((ticket) => (
                  <motion.div
                    key={ticket.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Link
                      href={`/dashboard/user/${ticket.id}`}
                      className="block rounded-2xl border p-5 transition-all duration-200 group"
                      style={{
                        backgroundColor: 'var(--color-card)',
                        borderColor: 'var(--color-border)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-brand)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="font-semibold truncate transition-colors"
                              style={{ color: 'var(--color-text)' }}
                            >
                              {ticket.title}
                            </h3>
                          </div>
                          <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {ticket.description}
                          </p>
                        </div>
                        <StatusBadge status={ticket.status} />
                      </div>

                      <div className="mt-4 pt-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--color-border)' }}>
                        <div className="flex items-center gap-2">
                          <Sparkles size={12} style={{ color: 'var(--color-text-muted)' }} />
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            Prioridad:{' '}
                            <span
                              className={`font-semibold ${
                                ticket.ai_priority === 'High' ? 'text-rose-400' :
                                ticket.ai_priority === 'Medium' ? 'text-amber-400' :
                                ticket.ai_priority ? 'text-emerald-400' : ''
                              }`}
                            >
                              {ticket.ai_priority || 'Analizando...'}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('es') : ''}
                          </span>
                          <ArrowRight size={14} style={{ color: 'var(--color-brand)' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
