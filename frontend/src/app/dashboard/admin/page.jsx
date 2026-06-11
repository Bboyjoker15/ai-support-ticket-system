'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BarChart3,
  Search,
  Shield,
  UserCog,
  Loader2,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  Filter,
  X,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import NotificationBell from '@/components/NotificationBell';
import MessageBell from '@/components/MessageBell';
import AgentTicketList from '@/components/AgentTicketList';
import AdminManagerDashboard from '@/components/AdminManagerDashboard';

const statusColors = { Open: 'blue', 'In Progress': 'amber', Resolved: 'emerald' };

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

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [agentTickets, setAgentTickets] = useState([]);
  const [adminError, setAdminError] = useState(false);
  const [ticketsError, setTicketsError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin_view_mode');
      if (saved === 'admin' || saved === 'agent') return saved;
    }
    return 'admin';
  });

  const [adminSection, setAdminSection] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('admin_section');
      if (['overview', 'tickets', 'users', 'manager'].includes(saved)) {
        sessionStorage.removeItem('admin_section');
        return saved;
      }
    }
    return 'overview';
  });

  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('All');

  const fetchMetricsAndTickets = async () => {
    try {
      const { data: tickets, error } = await supabase
        .from('tickets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAllTickets(tickets || []);
      setTicketsError(false);
    } catch { setTicketsError(true); }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('role', { ascending: true });
      if (error) throw error;
      setUsersList(data || []);
      setAdminError(false);
    } catch { setAdminError(true); }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user: authedUser }, error } = await supabase.auth.getUser();
        if (error || !authedUser) { router.push('/login'); return; }
        setUser(authedUser);
        await Promise.all([fetchMetricsAndTickets(), fetchUsers()]);
      } catch { router.push('/login'); }
      finally { setLoading(false); }
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    const canal = supabase
      .channel('cambios-globales-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchMetricsAndTickets())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  const roleCounts = useMemo(() => {
    return usersList.reduce((acc, u) => {
      if (u.role === 'Admin') acc.admin++;
      else if (u.role === 'Agent') acc.agent++;
      else acc.user++;
      return acc;
    }, { admin: 0, agent: 0, user: 0 });
  }, [usersList]);

  const userEmailById = useMemo(() => {
    const map = {};
    usersList.forEach(u => { map[u.id] = u.email; });
    return map;
  }, [usersList]);

  const ticketsMetrics = useMemo(() => {
    const m = { total: 0, open: 0, inProgress: 0, resolved: 0, highPriority: 0 };
    allTickets.forEach(t => {
      m.total++;
      if (t.status === 'Open') m.open++;
      if (t.status === 'In Progress') m.inProgress++;
      if (t.status === 'Resolved') m.resolved++;
      if (t.ai_priority === 'High') m.highPriority++;
    });
    return m;
  }, [allTickets]);

  const pieData = [
    { name: 'Abiertos', value: ticketsMetrics.open },
    { name: 'En Progreso', value: ticketsMetrics.inProgress },
    { name: 'Resueltos', value: ticketsMetrics.resolved },
  ];

  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('es', { weekday: 'short' });
      const count = allTickets.filter(t => {
        if (!t.created_at) return false;
        const td = new Date(t.created_at);
        return td.toDateString() === d.toDateString();
      }).length;
      days.push({ day: label, tickets: count });
    }
    return days;
  }, [allTickets]);

  const filteredAdminTickets = useMemo(() => {
    return allTickets.filter((t) => {
      const matchesStatus = ticketStatusFilter === 'All' || t.status === ticketStatusFilter;
      const q = ticketSearch.trim().toLowerCase();
      const matchesSearch = !q ||
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [allTickets, ticketStatusFilter, ticketSearch]);

  const assignedTicketIds = useMemo(
    () => agentTickets.filter(t => t.assigned_to === user?.id).map(t => t.id),
    [agentTickets, user?.id]
  );

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setActionLoading(false); }
  };

  const handleKickUser = async (userId) => {
    if (!confirm('¿Expulsar a este usuario?')) return;
    setActionLoading(true);
    try {
      await supabase.from('users').delete().eq('id', userId);
      fetchUsers();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setActionLoading(false); }
  };

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('admin_view_mode', mode);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-brand)' }} /></div>;
  }

  return (
    <div className="space-y-8">
      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-xl border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
          <button onClick={() => toggleViewMode('admin')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              backgroundColor: viewMode === 'admin' ? 'var(--color-card)' : 'transparent',
              color: viewMode === 'admin' ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}>
            <Shield size={14} /> Admin
          </button>
          <button onClick={() => toggleViewMode('agent')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              backgroundColor: viewMode === 'agent' ? 'var(--color-card)' : 'transparent',
              color: viewMode === 'agent' ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}>
            <UserCog size={14} /> Modo Agente
          </button>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell ticketLinkPrefix="/dashboard/admin/ticket" />
          {viewMode === 'agent' && (
            <MessageBell userId={user?.id} userRole="agent" assignedTicketIds={assignedTicketIds} />
          )}
        </div>
      </div>

      {viewMode === 'admin' ? (
        <>
          {/* Admin nav tabs */}
          <nav className="flex gap-1 p-1 rounded-xl border w-fit" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
            {[
              { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
              { id: 'manager', label: 'Analíticas', icon: BarChart3 },
              { id: 'tickets', label: 'Tickets', icon: ClipboardList },
              { id: 'users', label: 'Usuarios', icon: Users },
            ].map((tab) => {
              const active = adminSection === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setAdminSection(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: active ? 'var(--color-card)' : 'transparent',
                    color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                  }}>
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Overview */}
          {(adminSection === 'overview' || adminSection === 'tickets') && (
            <section className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={ClipboardList} label="Total" value={ticketsMetrics.total} color="indigo" />
                <StatCard icon={AlertCircle} label="Abiertos" value={ticketsMetrics.open} color="blue" />
                <StatCard icon={BarChart3} label="En Progreso" value={ticketsMetrics.inProgress} color="amber" />
                <StatCard icon={CheckCircle} label="Resueltos" value={ticketsMetrics.resolved} color="emerald" />
                <StatCard icon={AlertTriangle} label="Alta Prioridad" value={ticketsMetrics.highPriority} color="rose" />
                <StatCard icon={Users} label="Usuarios" value={usersList.length} color="purple" />
              </div>

              {/* Role badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'rgba(168,85,247,0.1)', color: '#a78bfa' }}>
                  {roleCounts.admin} Admin
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  {roleCounts.agent} Agentes
                </span>
                <span className="text-xs px-2.5 py-1 rounded-lg" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
                  {roleCounts.user} Clientes
                </span>
              </div>

              {/* Charts */}
              {adminSection === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Distribución por Estado</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-2">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                          {d.name}: {d.value}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                    <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Tickets (últimos 7 días)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={last7Days}>
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                        <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                        <Tooltip />
                        <Bar dataKey="tickets" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recent tickets */}
              {adminSection === 'overview' && (
                <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Tickets Recientes</h3>
                  {ticketsError ? (
                    <p className="text-sm text-rose-400">Error al cargar tickets.</p>
                  ) : allTickets.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay tickets.</p>
                  ) : (
                    <div className="space-y-2">
                      {allTickets.slice(0, 5).map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--color-bg)' }}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{t.title}</p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {userEmailById[t.user_id] || '—'} · {t.created_at ? new Date(t.created_at).toLocaleString('es') : '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border" style={{
                              color: t.ai_priority === 'High' ? '#f43f5e' : 'var(--color-text-muted)',
                              borderColor: t.ai_priority === 'High' ? 'rgba(244,63,94,0.3)' : 'var(--color-border)',
                            }}>{t.ai_priority || '—'}</span>
                            <Link href={`/dashboard/admin/ticket/${t.id}?from=tickets`}
                              className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-brand)' }}>
                              Ver <ArrowUpRight size={12} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Manager - Analytics */}
          {adminSection === 'manager' && (
            <AdminManagerDashboard users={usersList} tickets={allTickets} userEmailById={userEmailById} />
          )}

          {/* Tickets table */}
          {adminSection === 'tickets' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input
                    type="search"
                    placeholder="Buscar tickets..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                </div>
                <div className="flex gap-1 p-1 rounded-xl border w-fit" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
                  {['All', 'Open', 'In Progress', 'Resolved'].map((s) => (
                    <button key={s} onClick={() => setTicketStatusFilter(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all"
                      style={{
                        backgroundColor: ticketStatusFilter === s ? 'var(--color-card)' : 'transparent',
                        color: ticketStatusFilter === s ? 'var(--color-text)' : 'var(--color-text-muted)',
                      }}>
                      {s === 'All' ? 'Todos' : s}
                    </button>
                  ))}
                </div>
              </div>

              {ticketsError ? (
                <div className="rounded-2xl border p-6 text-center text-sm" style={{ color: '#f43f5e', backgroundColor: 'var(--color-card)' }}>Error al cargar tickets.</div>
              ) : filteredAdminTickets.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Sin resultados.</div>
              ) : (
                <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                          <th className="p-4">Ticket</th>
                          <th className="p-4">Cliente</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4">Prioridad IA</th>
                          <th className="p-4">Asignado</th>
                          <th className="p-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {filteredAdminTickets.map((t) => (
                          <tr key={t.id} className="transition-colors" style={{ backgroundColor: 'transparent' }}>
                            <td className="p-4">
                              <p className="font-medium" style={{ color: 'var(--color-text)' }}>{t.title}</p>
                              <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{t.id?.slice(0, 8)}…</p>
                            </td>
                            <td className="p-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{userEmailById[t.user_id] || '—'}</td>
                            <td className="p-4">
                              <span className="text-xs font-bold uppercase" style={{ color: `var(--color-${statusColors[t.status] || 'slate'})` }}>{t.status}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-bold" style={{
                                color: t.ai_priority === 'High' ? '#f43f5e' : t.ai_priority === 'Medium' ? '#f59e0b' : '#10b981'
                              }}>{t.ai_priority || '—'}</span>
                            </td>
                            <td className="p-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {t.assigned_to ? userEmailById[t.assigned_to] || 'Agente' : 'Sin asignar'}
                            </td>
                            <td className="p-4 text-right">
                              <Link href={`/dashboard/admin/ticket/${t.id}?from=tickets`}
                                className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
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

          {/* Users */}
          {adminSection === 'users' && (
            <section>
              {adminError ? (
                <div className="rounded-2xl border p-6 text-center text-sm" style={{ color: '#f43f5e' }}>Error al cargar usuarios.</div>
              ) : (
                <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs uppercase" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                          <th className="p-4">Correo</th>
                          <th className="p-4">Rol</th>
                          <th className="p-4 text-center">Cambiar Rol</th>
                          <th className="p-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {usersList.map((u) => (
                          <tr key={u.id} className="transition-colors">
                            <td className="p-4">
                              <span className="font-medium" style={{ color: 'var(--color-text)' }}>{u.email}</span>
                              {u.id === user?.id && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--color-brand)' }}>Tú</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{
                                backgroundColor: u.role === 'Agent' ? 'rgba(245,158,11,0.1)' : u.role === 'Admin' ? 'rgba(168,85,247,0.1)' : 'rgba(59,130,246,0.1)',
                                color: u.role === 'Agent' ? '#f59e0b' : u.role === 'Admin' ? '#a78bfa' : '#60a5fa',
                              }}>{u.role}</span>
                            </td>
                            <td className="p-4 text-center">
                              <select
                                disabled={actionLoading || u.id === user?.id}
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="text-xs rounded-lg p-1.5 border outline-none"
                                style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                              >
                                <option value="User">User</option>
                                <option value="Agent">Agent</option>
                                <option value="Admin">Admin</option>
                              </select>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                disabled={actionLoading || u.id === user?.id}
                                onClick={() => handleKickUser(u.id)}
                                className="text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all disabled:opacity-30"
                                style={{ backgroundColor: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}
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
      ) : (
        /* Agent mode view */
        <section className="space-y-6">
          <div className="p-4 rounded-xl text-sm" style={{ backgroundColor: 'rgba(99,102,241,0.05)', color: 'var(--color-text-secondary)' }}>
            Estás operando como agente desde el panel admin.
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
    </div>
  );
}

