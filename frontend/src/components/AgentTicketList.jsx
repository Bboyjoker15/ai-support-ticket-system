'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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

  const detailBase = adminMode ? '/dashboard/admin/ticket' : '/dashboard/agent';
  const tabActiveClass = adminMode
    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg';
  const titleHover = adminMode ? 'group-hover:text-purple-400' : 'group-hover:text-amber-400';

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
        <div className="flex flex-wrap gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 w-full lg:max-w-2xl">
          {tabLabels.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? tabActiveClass
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/80">
          <span className="text-[10px] font-bold uppercase text-slate-500 px-2">
            Prioridad:
          </span>
          {[
            { id: 'All', label: 'Todos', activeStyle: 'bg-slate-800 text-white border-slate-600' },
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
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 w-fit">
        {['All', 'Open', 'In Progress', 'Resolved'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
              statusFilter === status
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {status === 'All' ? 'Todos los estados' : status}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">{sectionTitle}</h3>
        <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
          {displayedTickets.length} en vista
        </span>
      </div>

      {fetchError ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center text-rose-400 text-sm">
          Error al sincronizar con Supabase. Refresca la página.
        </div>
      ) : displayedTickets.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
          <p className="text-sm text-slate-400">No hay tickets con estos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {displayedTickets.map((ticket) => {
            const assigneeEmail = ticket.assigned_to
              ? userEmailById[ticket.assigned_to]
              : null;
            const detailHref = adminMode
              ? `${detailBase}/${ticket.id}?from=agent`
              : `${detailBase}/${ticket.id}`;

            return (
              <div
                key={ticket.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col hover:border-slate-700 transition shadow-md"
              >
                <Link href={detailHref} className="group block text-left">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block mb-0.5">
                        ID: {ticket.id.slice(0, 8)}…
                      </span>
                      <h3
                        className={`font-semibold text-white text-lg ${titleHover} transition`}
                      >
                        {ticket.title}
                      </h3>
                      {adminMode && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Asignado:{' '}
                          <span className="text-slate-400">
                            {assigneeEmail ||
                              (ticket.assigned_to
                                ? `${ticket.assigned_to.slice(0, 8)}…`
                                : 'Sin asignar')}
                          </span>
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border shrink-0 ${
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

                  <p className="text-sm text-slate-400 mb-4 p-3 bg-slate-950/20 rounded-xl border border-slate-800/40 line-clamp-3">
                    {ticket.description}
                  </p>

                  <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span>
                        <span className="text-slate-500 uppercase text-[10px] font-bold">
                          Prioridad:{' '}
                        </span>
                        <span
                          className={`font-bold ${
                            ticket.ai_priority === 'High'
                              ? 'text-rose-400'
                              : ticket.ai_priority === 'Medium'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        >
                          {ticket.ai_priority || 'Pendiente'}
                        </span>
                      </span>
                      <span>
                        <span className="text-slate-500 uppercase text-[10px] font-bold">
                          Riesgo:{' '}
                        </span>
                        <span className="text-orange-400 font-bold">
                          {ticket.ai_risk_level || 'Pendiente'}
                        </span>
                      </span>
                    </div>
                    {ticket.ai_summary && (
                      <p className="text-xs text-slate-400 italic border-t border-slate-800/50 pt-2">
                        {ticket.ai_summary}
                      </p>
                    )}
                  </div>
                </Link>

                <div className="flex gap-2.5 mt-5 pt-4 border-t border-slate-800/40 justify-end flex-wrap">
                  <Link
                    href={detailHref}
                    className="px-3 py-2 text-xs font-semibold text-slate-400 border border-slate-700 rounded-xl hover:text-white transition"
                  >
                    Abrir chat
                  </Link>
                  {ticket.status === 'Open' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(ticket.id, 'In Progress')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition border ${
                        adminMode
                          ? 'bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      Atender y asignarme
                    </button>
                  )}
                  {ticket.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                      className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-500/20 transition"
                    >
                      Resolver ticket
                    </button>
                  )}
                  {ticket.status === 'Resolved' && (
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-800/50 px-3 py-1.5 rounded-xl uppercase">
                      Caso cerrado
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
