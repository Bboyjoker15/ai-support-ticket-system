'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

export default function AgentTicketList({
  user,
  realtimeChannelId = 'agent-ticket-list',
  onTicketsChange,
  embedded = false,
  adminMode = false,
  userEmailById = {},
}) {
  const [tickets, setTickets] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [activeTab, setActiveTab] = useState(adminMode ? 'all' : 'global');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const priorityColors = { High: 'rose', Medium: 'amber', Low: 'emerald' };
  const statusColors = { Open: 'blue', 'In Progress': 'amber', Resolved: 'emerald' };

  const detailBase = adminMode ? '/dashboard/admin/ticket' : '/dashboard/agent';
  const tabActiveClass = adminMode
    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg';
  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
      setFetchError(false);
    } catch {
      setFetchError(true);
    }
  }, []);

  useEffect(() => {
    fetchTickets();

    const canal = supabase
      .channel(realtimeChannelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => fetchTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [realtimeChannelId, fetchTickets]);

  useEffect(() => {
    onTicketsChange?.(tickets);
  }, [tickets, onTicketsChange]);

  const handleUpdateStatus = async (ticketId, newStatus) => {
    const shouldAssign = newStatus === 'In Progress';

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: newStatus,
              assigned_to: shouldAssign ? user?.id : t.assigned_to,
            }
          : t
      )
    );

    try {
      const updateData = { status: newStatus };
      if (shouldAssign) updateData.assigned_to = user?.id;

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
      fetchTickets();
    } catch (err) {
      alert('No se pudo guardar en la base de datos: ' + err.message);
      fetchTickets();
    }
  };

  const displayedTickets = tickets.filter((ticket) => {
    let matchesTab = true;

    if (adminMode) {
      if (activeTab === 'mine') {
        matchesTab = ticket.assigned_to === user?.id;
      } else if (activeTab === 'agents') {
        matchesTab =
          Boolean(ticket.assigned_to) && ticket.assigned_to !== user?.id;
      }
      // activeTab === 'all' → todos
    } else if (activeTab === 'mine') {
      matchesTab = ticket.assigned_to === user?.id;
    } else {
      matchesTab =
        !ticket.assigned_to || ticket.assigned_to === user?.id;
    }

    const matchesPriority =
      priorityFilter === 'All'
        ? true
        : ticket.ai_priority?.toLowerCase() === priorityFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'All' ? true : ticket.status === statusFilter;

    return matchesTab && matchesPriority && matchesStatus;
  });

  const tabLabels = adminMode
    ? [
        { id: 'all', label: 'Todos' },
        { id: 'mine', label: 'Mis casos' },
        { id: 'agents', label: 'En agentes' },
      ]
    : [
        { id: 'global', label: 'Bandeja global' },
        { id: 'mine', label: 'Mis casos' },
      ];

  const sectionTitle = adminMode
    ? activeTab === 'all'
      ? 'Supervisión — todos los tickets'
      : activeTab === 'mine'
        ? 'Tickets asignados a ti'
        : 'Tickets asignados a otros agentes'
    : activeTab === 'global'
      ? 'Incidencias disponibles'
      : 'Mis casos en curso';

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6'}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl border w-full lg:max-w-2xl" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {tabLabels.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? tabActiveClass
                  : ''
              }`}
              style={activeTab !== tab.id ? { color: 'var(--color-text-muted)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <span className="text-[10px] font-bold uppercase px-2" style={{ color: 'var(--color-text-muted)' }}>
            Prioridad:
          </span>
          {[
            { id: 'All', label: 'Todos', activeStyle: '', activeBg: 'var(--color-bg)', activeText: 'var(--color-text)', activeBorder: 'var(--color-border)' },
            { id: 'High', label: 'Alta', activeStyle: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
            { id: 'Medium', label: 'Media', activeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
            { id: 'Low', label: 'Baja', activeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setPriorityFilter(btn.id)}
              className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition ${
                priorityFilter === btn.id
                  ? btn.activeStyle
                  : ''
              }`}
              style={priorityFilter !== btn.id ? { color: 'var(--color-text-muted)', background: 'transparent', borderColor: 'transparent' } : btn.id === 'All' ? { backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', borderColor: 'var(--color-border)' } : {}}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl border w-fit" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        {['All', 'Open', 'In Progress', 'Resolved'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
              statusFilter === status
                ? 'border'
                : ''
            }`}
            style={{
              backgroundColor: statusFilter === status ? 'var(--color-bg)' : 'transparent',
              color: statusFilter === status ? 'var(--color-text)' : 'var(--color-text-muted)',
              borderColor: statusFilter === status ? 'var(--color-border)' : 'transparent',
            }}
          >
            {status === 'All' ? 'Todos los estados' : status}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{sectionTitle}</h3>
        <span className="text-xs px-3 py-1 rounded-full border" style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {displayedTickets.length} en vista
        </span>
      </div>

      {fetchError ? (
        <div className="border rounded-2xl p-6 text-center text-sm" style={{ backgroundColor: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.2)', color: '#fb7185' }}>
          Error al sincronizar con Supabase. Refresca la página.
        </div>
      ) : displayedTickets.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay tickets con estos filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {displayedTickets.map((ticket) => {
              const assigneeEmail = ticket.assigned_to
                ? userEmailById[ticket.assigned_to]
                : null;
              const detailHref = adminMode
                ? `${detailBase}/${ticket.id}?from=agent`
                : `${detailBase}/${ticket.id}`;
              const pColor = priorityColors[ticket.ai_priority] || 'slate';
              const sColor = statusColors[ticket.status] || 'slade';

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
                    <Link href={detailHref} className="block group">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono block mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            ID: {ticket.id?.slice(0, 8)}...
                          </span>
                          <h3 className="font-semibold text-base transition-colors" style={{ color: 'var(--color-text)' }}>
                            {ticket.title}
                          </h3>
                          {adminMode && (
                            <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                              Asignado:{' '}
                              <span style={{ color: 'var(--color-text-secondary)' }}>
                                {assigneeEmail ||
                                  (ticket.assigned_to
                                    ? `${ticket.assigned_to.slice(0, 8)}…`
                                    : 'Sin asignar')}
                              </span>
                            </p>
                          )}
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
                            <span className="font-bold text-orange-400">{ticket.ai_risk_level || 'Pendiente'}</span>
                          </span>
                          <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                            Clasificación:{' '}
                            <span className="font-bold text-indigo-400">{ticket.ai_classification || 'Pendiente'}</span>
                          </span>
                        </div>
                        {ticket.ai_summary && (
                          <div className="flex items-start gap-1.5 pt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                            <Sparkles size={12} style={{ color: 'var(--color-brand)' }} className="mt-0.5" />
                            <p className="italic" style={{ color: 'var(--color-text-secondary)' }}>{ticket.ai_summary}</p>
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex gap-2 mt-4 pt-4 justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
                      {ticket.status === 'Open' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(ticket.id, 'In Progress')}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{
                            backgroundColor: adminMode ? 'rgba(168,85,247,0.1)' : 'rgba(245,158,11,0.1)',
                            border: adminMode ? '1px solid rgba(168,85,247,0.2)' : '1px solid rgba(245,158,11,0.2)',
                            color: adminMode ? '#a855f7' : '#f59e0b',
                          }}
                        >
                          <UserCheck size={14} /> Atender
                        </button>
                      )}
                      {ticket.status === 'In Progress' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                          style={{
                            backgroundColor: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.2)',
                            color: '#10b981',
                          }}
                        >
                          <CheckCircle size={14} /> Resolver
                        </button>
                      )}
                      {ticket.status === 'Resolved' && (
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ color: 'var(--color-text-muted)' }}>
                          Cerrado
                        </span>
                      )}
                      <Link
                        href={detailHref}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Detalle <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
