'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import MessageBell from '@/components/MessageBell';
import AgentTicketList from '@/components/AgentTicketList';
import AdminManagerDashboard from '@/components/AdminManagerDashboard';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [usersList, setUsersList] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [agentTickets, setAgentTickets] = useState([]);
  const [ticketsMetrics, setTicketsMetrics] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    highPriority: 0,
  });
  const [adminError, setAdminError] = useState(false);
  const [ticketsError, setTicketsError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('admin_view_mode');
      if (savedMode === 'admin' || savedMode === 'agent') return savedMode;
    }
    return 'admin';
  });
  const [adminSection, setAdminSection] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedSection = sessionStorage.getItem('admin_section');
      if (
        savedSection === 'overview' ||
        savedSection === 'tickets' ||
        savedSection === 'users' ||
        savedSection === 'manager'
      ) {
        sessionStorage.removeItem('admin_section');
        return savedSection;
      }
    }
    return 'overview';
  });
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('All');

  const fetchMetricsAndTickets = async () => {
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = tickets || [];
      setAllTickets(list);

      const metrics = list.reduce(
        (acc, ticket) => {
          acc.total++;
          if (ticket.status === 'Open') acc.open++;
          if (ticket.status === 'In Progress') acc.inProgress++;
          if (ticket.status === 'Resolved') acc.resolved++;
          if (ticket.ai_priority === 'High') acc.highPriority++;
          return acc;
        },
        { total: 0, open: 0, inProgress: 0, resolved: 0, highPriority: 0 }
      );
      setTicketsMetrics(metrics);
      setTicketsError(false);
    } catch (err) {
      console.error('Error cargando tickets:', err);
      setTicketsError(true);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('role', { ascending: true });

      if (error) throw error;
      setUsersList(data || []);
      setAdminError(false);
    } catch {
      setAdminError(true);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { user: authedUser },
          error,
        } = await supabase.auth.getUser();
        if (error || !authedUser) {
          router.push('/login');
          return;
        }
        setUser(authedUser);
        await Promise.all([fetchMetricsAndTickets(), fetchUsers()]);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    const canal = supabase
      .channel('cambios-globales-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => fetchMetricsAndTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const roleCounts = useMemo(() => {
    return usersList.reduce(
      (acc, u) => {
        if (u.role === 'Admin') acc.admin++;
        else if (u.role === 'Agent') acc.agent++;
        else acc.user++;
        return acc;
      },
      { admin: 0, agent: 0, user: 0 }
    );
  }, [usersList]);

  const userEmailById = useMemo(() => {
    const map = {};
    usersList.forEach((u) => {
      map[u.id] = u.email;
    });
    return map;
  }, [usersList]);

  const filteredAdminTickets = useMemo(() => {
    return allTickets.filter((t) => {
      const matchesStatus =
        ticketStatusFilter === 'All' || t.status === ticketStatusFilter;
      const q = ticketSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allTickets, ticketStatusFilter, ticketSearch]);

  const assignedTicketIds = useMemo(
    () =>
      agentTickets
        .filter((t) => t.assigned_to === user?.id)
        .map((t) => t.id),
    [agentTickets, user?.id]
  );

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      alert('Error al actualizar el rol: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKickUser = async (userId) => {
    if (!confirm('¿Expulsar a este usuario de la plataforma?')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      alert('Error al expulsar usuario: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('admin_view_mode', mode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col gap-4 items-center justify-center text-white font-medium">
        <svg
          className="animate-spin h-8 w-8 text-purple-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-slate-400 tracking-wide animate-pulse">
          Cargando panel de administración...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <header className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            {viewMode === 'admin'
              ? 'Panel de Control de Administración'
              : 'Mesa de Operaciones (Modo Agente)'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {user?.email}
            <span className="text-xs bg-purple-950 text-purple-400 ml-2 px-2 py-0.5 rounded-md font-mono border border-purple-800/60 font-semibold uppercase">
              Admin · {viewMode}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="bg-slate-900 p-1 border border-slate-800 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => toggleViewMode('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'admin'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Modo Admin
            </button>
            <button
              type="button"
              onClick={() => toggleViewMode('agent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'agent'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Modo Agente
            </button>
          </div>

          <NotificationBell ticketLinkPrefix="/dashboard/admin/ticket" />
          {viewMode === 'agent' && (
            <MessageBell
              userId={user?.id}
              userRole="agent"
              assignedTicketIds={assignedTicketIds}
            />
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-xl text-xs font-semibold uppercase tracking-wider transition text-slate-300"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        {viewMode === 'admin' && (
          <>
            <nav className="flex flex-wrap gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 w-fit">
              {[
                { id: 'overview', label: 'Resumen' },
                { id: 'manager', label: 'Manager' },
                { id: 'tickets', label: 'Tickets' },
                { id: 'users', label: 'Usuarios' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAdminSection(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                    adminSection === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {(adminSection === 'overview' || adminSection === 'tickets') && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">
                  Métricas globales de soporte
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Total', value: ticketsMetrics.total, color: 'text-white' },
                    { label: 'Abiertos', value: ticketsMetrics.open, color: 'text-blue-400' },
                    {
                      label: 'En progreso',
                      value: ticketsMetrics.inProgress,
                      color: 'text-amber-400',
                    },
                    {
                      label: 'Resueltos',
                      value: ticketsMetrics.resolved,
                      color: 'text-emerald-400',
                    },
                    {
                      label: 'Prioridad alta',
                      value: ticketsMetrics.highPriority,
                      color: 'text-rose-400',
                    },
                    {
                      label: 'Usuarios',
                      value: usersList.length,
                      color: 'text-purple-400',
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                    >
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {m.label}
                      </span>
                      <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {roleCounts.admin} Admin
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {roleCounts.agent} Agentes
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {roleCounts.user} Clientes
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdminSection('manager')}
                    className="text-xs text-purple-400 hover:underline font-medium ml-auto"
                  >
                    Ver centro Manager →
                  </button>
                </div>
              </section>
            )}

            {adminSection === 'manager' && (
              <AdminManagerDashboard
                users={usersList}
                tickets={allTickets}
                userEmailById={userEmailById}
              />
            )}

            {adminSection === 'overview' && (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">
                  Tickets recientes (últimos 5)
                </h2>
                {ticketsError ? (
                  <p className="text-rose-400 text-sm">No se pudieron cargar los tickets.</p>
                ) : allTickets.length === 0 ? (
                  <p className="text-slate-500 text-sm">No hay tickets en el sistema.</p>
                ) : (
                  <ul className="space-y-2">
                    {allTickets.slice(0, 5).map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/50 rounded-xl border border-slate-800/60"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{t.title}</p>
                          <p className="text-xs text-slate-500">
                            {userEmailById[t.user_id] || 'Usuario'} ·{' '}
                            {t.created_at
                              ? new Date(t.created_at).toLocaleString()
                              : '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              t.ai_priority === 'High'
                                ? 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                                : 'text-slate-400 border-slate-700'
                            }`}
                          >
                            {t.ai_priority || '—'}
                          </span>
                          <Link
                            href={`/dashboard/admin/ticket/${t.id}?from=tickets`}
                            className="text-xs text-purple-400 hover:underline font-medium"
                          >
                            Ver →
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => setAdminSection('tickets')}
                  className="mt-4 text-xs text-purple-400 hover:underline font-medium"
                >
                  Ver todos los tickets →
                </button>
              </section>
            )}

            {adminSection === 'tickets' && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white">
                  Vista global de tickets
                </h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="search"
                    placeholder="Buscar por título, descripción o ID..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="flex-1 p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {['All', 'Open', 'In Progress', 'Resolved'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTicketStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase ${
                          ticketStatusFilter === s
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        {s === 'All' ? 'Todos' : s}
                      </button>
                    ))}
                  </div>
                </div>

                {ticketsError ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-rose-400 text-sm text-center">
                    Error al cargar tickets.
                  </div>
                ) : filteredAdminTickets.length === 0 ? (
                  <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
                    Sin resultados para estos filtros.
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase text-slate-500">
                            <th className="p-4">Ticket</th>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Prioridad IA</th>
                            <th className="p-4">Asignado</th>
                            <th className="p-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredAdminTickets.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-950/30">
                              <td className="p-4">
                                <p className="font-medium text-white">{t.title}</p>
                                <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                                  {t.id.slice(0, 8)}…
                                </p>
                              </td>
                              <td className="p-4 text-slate-400 text-xs">
                                {userEmailById[t.user_id] || '—'}
                              </td>
                              <td className="p-4">
                                <span className="text-xs font-bold uppercase text-slate-300">
                                  {t.status}
                                </span>
                              </td>
                              <td className="p-4">
                                <span
                                  className={`text-xs font-bold ${
                                    t.ai_priority === 'High'
                                      ? 'text-rose-400'
                                      : t.ai_priority === 'Medium'
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                  }`}
                                >
                                  {t.ai_priority || 'Pendiente'}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-slate-500">
                                {t.assigned_to
                                  ? userEmailById[t.assigned_to] || 'Agente'
                                  : 'Sin asignar'}
                              </td>
                              <td className="p-4 text-right">
                                <Link
                                  href={`/dashboard/admin/ticket/${t.id}?from=tickets`}
                                  className="text-xs font-semibold text-purple-400 hover:underline"
                                >
                                  Gestionar
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}

            {adminSection === 'users' && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">
                  Gestión de usuarios y permisos
                </h2>
                {adminError ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center text-rose-400 text-sm">
                    Error al consultar usuarios.
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <th className="p-4">Correo</th>
                            <th className="p-4">ID</th>
                            <th className="p-4">Rol</th>
                            <th className="p-4 text-center">Cambiar rol</th>
                            <th className="p-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                          {usersList.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-950/20">
                              <td className="p-4">
                                <span className="text-white font-medium">{u.email}</span>
                                {u.id === user?.id && (
                                  <span className="ml-2 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">
                                    Tú
                                  </span>
                                )}
                              </td>
                              <td className="p-4 font-mono text-[10px] text-slate-600 max-w-[120px] truncate">
                                {u.id}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-mono border font-semibold ${
                                    u.role === 'Agent'
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                      : u.role === 'Admin'
                                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <select
                                  disabled={actionLoading || u.id === user?.id}
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  className="bg-slate-950 border border-slate-800 text-xs rounded-lg p-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-40"
                                >
                                  <option value="User">User</option>
                                  <option value="Agent">Agent</option>
                                  <option value="Admin">Admin</option>
                                </select>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  type="button"
                                  disabled={actionLoading || u.id === user?.id}
                                  onClick={() => handleKickUser(u.id)}
                                  className="text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1.5 rounded-xl transition disabled:opacity-30"
                                >
                                  Expulsar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {viewMode === 'agent' && (
          <section className="space-y-6">
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
              <p className="text-sm text-amber-200/90">
                Estás operando como agente desde el panel admin: misma bandeja, filtros,
                priorización IA, chat y acciones de atender/resolver. Las alertas críticas y
                mensajes aparecen en las campanas del encabezado.
              </p>
            </div>
            <AgentTicketList
              user={user}
              embedded
              adminMode
              userEmailById={userEmailById}
              realtimeChannelId="admin-agent-mode"
              onTicketsChange={setAgentTickets}
            />
          </section>
        )}
      </main>
    </div>
  );
}
