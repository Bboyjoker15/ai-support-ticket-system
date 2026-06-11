'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Ticket,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Users,
  UserCheck,
  Bell,
  MessageCircle,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import MessageBell from '@/components/MessageBell';

const statusColors = {
  Open: 'blue',
  'In Progress': 'amber',
  Resolved: 'emerald',
};

const priorityColors = {
  High: 'rose',
  Medium: 'amber',
  Low: 'emerald',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `rgba(var(--color-${color}), 0.1)` }}>
          <Icon size={20} style={{ color: `var(--color-${color})` }} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AgentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets').select('*').order('created_at', { ascending: false });

      if (error) setFetchError(true);
      else if (data) { setTickets(data); setFetchError(false); }
    } catch { setFetchError(true); }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user: authedUser }, error } = await supabase.auth.getUser();
        if (error || !authedUser) { router.push('/login'); return; }
        setUser(authedUser);
        fetchTickets();
      } catch { router.push('/login'); }
      finally { setLoading(false); }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    const canal = supabase
      .channel('cambios-globales-agent')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchTickets());
    canal.subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const handleUpdateStatus = async (ticketId, newStatus) => {
    const shouldAssign = newStatus === 'In Progress';
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, status: newStatus, assigned_to: shouldAssign ? user?.id : t.assigned_to }
          : t
      )
    );
    try {
      const updateData = { status: newStatus };
      if (shouldAssign) updateData.assigned_to = user?.id;
      const { error } = await supabase.from('tickets').update(updateData).eq('id', ticketId);
      if (error) throw error;
      fetchTickets();
    } catch (err) {
      alert('Error: ' + err.message);
      fetchTickets();
    }
  };

  const displayedTickets = tickets.filter((ticket) => {
    const matchesTab = activeTab === 'mine'
      ? ticket.assigned_to === user?.id
      : !ticket.assigned_to || ticket.assigned_to === user?.id;
    const matchesPriority = priorityFilter === 'All'
      ? true
      : ticket.ai_priority?.toLowerCase() === priorityFilter.toLowerCase();
    return matchesTab && matchesPriority;
  });

  const assignedTicketIds = tickets
    .filter((ticket) => ticket.assigned_to === user?.id)
    .map((ticket) => ticket.id);

  const stats = {
    total: tickets.length,
    available: tickets.filter(t => !t.assigned_to).length,
    assigned: tickets.filter(t => t.assigned_to === user?.id).length,
    resolved: tickets.filter(t => t.status === 'Resolved' && t.assigned_to === user?.id).length,
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
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Total Tickets" value={stats.total} color="indigo" />
        <StatCard icon={Users} label="Disponibles" value={stats.available} color="blue" />
        <StatCard icon={UserCheck} label="Mis Asignados" value={stats.assigned} color="amber" />
        <StatCard icon={Ticket} label="Resueltos por mí" value={stats.resolved} color="emerald" />
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-1 p-1 rounded-xl border w-fit" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          {[
            { id: 'global', label: 'Bandeja Global', icon: ClipboardList },
            { id: 'mine', label: 'Mis Casos', icon: UserCheck },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200"
                style={{
                  backgroundColor: active ? 'var(--color-card)' : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell userId={user?.id} userRole="agent" assignedTicketIds={assignedTicketIds} />
          <MessageBell userId={user?.id} userRole="agent" assignedTicketIds={assignedTicketIds} />
        </div>
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Prioridad:
        </span>
        {['All', 'High', 'Medium', 'Low'].map((p) => {
          const active = priorityFilter === p;
          const color = priorityColors[p] || 'indigo';
          return (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor: active ? `rgba(var(--color-${color}), 0.1)` : 'transparent',
                color: active ? `var(--color-${color})` : 'var(--color-text-muted)',
                border: active ? `1px solid rgba(var(--color-${color}), 0.2)` : '1px solid transparent',
              }}
            >
              {p === 'All' ? 'Todos' : p}
            </button>
          );
        })}
      </div>

      {/* Tickets */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {activeTab === 'global' ? 'Incidencias Disponibles' : 'Mis Casos en Curso'}
          </h2>
          <span className="text-xs px-3 py-1 rounded-full border" style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
            {displayedTickets.length} casos
          </span>
        </div>

        {fetchError ? (
          <div className="rounded-2xl border p-6 text-center text-sm" style={{ color: '#f43f5e', backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            Error al cargar tickets. Refresca la página.
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-16 flex flex-col items-center justify-center text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <AlertCircle size={40} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
            <p className="mt-4 text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              No hay tickets con estos filtros
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayedTickets.map((ticket) => {
                const pColor = priorityColors[ticket.ai_priority] || 'slate';
                const sColor = statusColors[ticket.status] || 'slate';
                return (
                  <motion.div
                    key={ticket.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl border overflow-hidden"
                    style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                  >
                    <div className="p-5">
                      {/* Card header */}
                      <Link href={`/dashboard/agent/${ticket.id}`} className="block group">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono block mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              ID: {ticket.id?.slice(0, 8)}...
                            </span>
                            <h3 className="font-semibold text-base transition-colors" style={{ color: 'var(--color-text)' }}>
                              {ticket.title}
                            </h3>
                          </div>
                          <span
                            className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
                            style={{
                              backgroundColor: `rgba(var(--color-${sColor}), 0.1)`,
                              borderColor: `rgba(var(--color-${sColor}), 0.2)`,
                              color: `var(--color-${sColor})`,
                            }}
                          >
                            {ticket.status}
                          </span>
                        </div>

                        <p className="text-sm line-clamp-2 mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                          {ticket.description}
                        </p>

                        {/* AI fields */}
                        <div className="p-4 rounded-xl text-xs space-y-2" style={{ backgroundColor: 'var(--color-bg)' }}>
                          <div className="flex flex-wrap gap-3">
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                              Prioridad:{' '}
                              <span className="font-bold" style={{ color: `var(--color-${pColor})` }}>
                                {ticket.ai_priority || 'Pendiente'}
                              </span>
                            </span>
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                              Riesgo:{' '}
                              <span className="font-bold text-orange-400">
                                {ticket.ai_risk_level || 'Pendiente'}
                              </span>
                            </span>
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                              Clasificación:{' '}
                              <span className="font-semibold text-indigo-400">
                                {ticket.ai_classification || 'Pendiente'}
                              </span>
                            </span>
                          </div>
                          {ticket.ai_summary && (
                            <div className="flex items-start gap-1.5 pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                              <Sparkles size={12} style={{ color: 'var(--color-brand)' }} className="mt-0.5" />
                              <p className="italic" style={{ color: 'var(--color-text-secondary)' }}>
                                {ticket.ai_summary}
                              </p>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-4 pt-4 justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
                        {ticket.status === 'Open' && (
                          <button
                            onClick={() => handleUpdateStatus(ticket.id, 'In Progress')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{
                              backgroundColor: 'rgba(245,158,11,0.1)',
                              border: '1px solid rgba(245,158,11,0.2)',
                              color: '#f59e0b',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.1)'}
                          >
                            <UserCheck size={14} />
                            Atender
                          </button>
                        )}
                        {ticket.status === 'In Progress' && (
                          <button
                            onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                            style={{
                              backgroundColor: 'rgba(16,185,129,0.1)',
                              border: '1px solid rgba(16,185,129,0.2)',
                              color: '#10b981',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)'}
                          >
                            <CheckCircle size={14} />
                            Resolver
                          </button>
                        )}
                        {ticket.status === 'Resolved' && (
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ color: 'var(--color-text-muted)' }}>
                            Cerrado
                          </span>
                        )}
                        <Link
                          href={`/dashboard/agent/${ticket.id}`}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Detalle
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
