'use client';

import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];
const PRIO_COLORS = ['#f43f5e', '#f59e0b', '#10b981'];

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

function avgHoursToResolve(tickets) {
  const resolved = tickets.filter(t => t.status === 'Resolved' && t.created_at && t.updated_at);
  if (resolved.length === 0) return null;
  const totalHours = resolved.reduce((sum, t) => {
    const h = (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
    return sum + (h > 0 ? h : 0);
  }, 0);
  return totalHours / resolved.length;
}

function formatHours(h) {
  if (h == null || Number.isNaN(h)) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

function KpiCard({ icon: Icon, label, value, color }) {
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

export default function AdminManagerDashboard({ users = [], tickets = [], userEmailById = {} }) {
  const [managerTab, setManagerTab] = useState('global');

  const globalMetrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'Open').length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const resolved = tickets.filter(t => t.status === 'Resolved').length;
    const unassigned = tickets.filter(t => !t.assigned_to && t.status !== 'Resolved').length;
    const high = tickets.filter(t => t.ai_priority === 'High').length;
    const medium = tickets.filter(t => t.ai_priority === 'Medium').length;
    const low = tickets.filter(t => t.ai_priority?.toLowerCase() === 'low').length;
    const last24h = tickets.filter(t => isWithinDays(t.created_at, 1)).length;
    const last7d = tickets.filter(t => isWithinDays(t.created_at, 7)).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const avgResolve = avgHoursToResolve(tickets);
    const openHigh = tickets.filter(t => t.ai_priority === 'High' && t.status !== 'Resolved').length;
    return { total, open, inProgress, resolved, unassigned, high, medium, low, last24h, last7d, resolutionRate, avgResolve, openHigh,
      agents: users.filter(u => u.role === 'Agent').length,
      clients: users.filter(u => u.role === 'User').length,
      admins: users.filter(u => u.role === 'Admin').length,
    };
  }, [tickets, users]);

  const statusPieData = [
    { name: 'Abiertos', value: globalMetrics.open },
    { name: 'En Progreso', value: globalMetrics.inProgress },
    { name: 'Resueltos', value: globalMetrics.resolved },
  ];

  const priorityPieData = [
    { name: 'Alta', value: globalMetrics.high },
    { name: 'Media', value: globalMetrics.medium },
    { name: 'Baja', value: globalMetrics.low },
  ];

  const clientStats = useMemo(() => {
    return users.filter(u => u.role === 'User').map(u => {
      const mine = tickets.filter(t => t.user_id === u.id);
      return {
        id: u.id, email: u.email,
        total: mine.length, open: mine.filter(t => t.status === 'Open').length,
        inProgress: mine.filter(t => t.status === 'In Progress').length,
        resolved: mine.filter(t => t.status === 'Resolved').length,
        high: mine.filter(t => t.ai_priority === 'High').length,
        lastTicket: mine[0]?.created_at || null,
      };
    }).sort((a, b) => b.total - a.total);
  }, [users, tickets]);

  const staffStats = useMemo(() => {
    return users.filter(u => u.role === 'Agent' || u.role === 'Admin').map(u => {
      const assigned = tickets.filter(t => t.assigned_to === u.id);
      const resolved = assigned.filter(t => t.status === 'Resolved');
      return {
        id: u.id, email: u.email, role: u.role,
        assigned: assigned.length,
        open: assigned.filter(t => t.status === 'Open').length,
        inProgress: assigned.filter(t => t.status === 'In Progress').length,
        resolved: resolved.length,
        high: assigned.filter(t => t.ai_priority === 'High').length,
        resolutionRate: assigned.length > 0 ? Math.round((resolved.length / assigned.length) * 100) : 0,
        avgResolve: avgHoursToResolve(assigned),
        activeLoad: assigned.filter(t => t.status === 'In Progress').length,
      };
    }).sort((a, b) => b.assigned - a.assigned);
  }, [users, tickets]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <nav className="flex gap-1 p-1 rounded-xl border w-fit" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}>
        {[
          { id: 'global', label: 'General', icon: BarChart3 },
          { id: 'clients', label: 'Clientes', icon: Users },
          { id: 'staff', label: 'Staff', icon: TrendingUp },
        ].map((tab) => {
          const active = managerTab === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setManagerTab(tab.id)}
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

      {managerTab === 'global' && (
        <div className="space-y-6">
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={BarChart3} label="Tickets Totales" value={globalMetrics.total} color="indigo" />
            <KpiCard icon={TrendingUp} label="Tasa Resolución" value={`${globalMetrics.resolutionRate}%`} color="emerald" />
            <KpiCard icon={Clock} label="Tiempo Promedio" value={formatHours(globalMetrics.avgResolve)} color="cyan" />
            <KpiCard icon={AlertTriangle} label="Alta Prioridad" value={globalMetrics.openHigh} color="rose" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Distribución por Estado</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                    {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                {statusPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Distribución por Prioridad IA</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { name: 'Alta', value: globalMetrics.high },
                  { name: 'Media', value: globalMetrics.medium },
                  { name: 'Baja', value: globalMetrics.low },
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {PRIO_COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Team */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border p-5 text-center" style={{ backgroundColor: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.15)' }}>
              <p className="text-2xl font-bold" style={{ color: '#a78bfa' }}>{globalMetrics.admins}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Admins</p>
            </div>
            <div className="rounded-2xl border p-5 text-center" style={{ backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.15)' }}>
              <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{globalMetrics.agents}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Agentes</p>
            </div>
            <div className="rounded-2xl border p-5 text-center" style={{ backgroundColor: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.15)' }}>
              <p className="text-2xl font-bold" style={{ color: '#60a5fa' }}>{globalMetrics.clients}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Clientes</p>
            </div>
          </div>
        </div>
      )}

      {managerTab === 'clients' && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {clientStats.length === 0 ? (
            <p className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay clientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-xs uppercase" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th className="p-4">Cliente</th>
                    <th className="p-4 text-center">Total</th>
                    <th className="p-4 text-center text-blue-400">Open</th>
                    <th className="p-4 text-center text-amber-400">En Progreso</th>
                    <th className="p-4 text-center text-emerald-400">Resueltos</th>
                    <th className="p-4 text-center text-rose-400">Alta Prior.</th>
                    <th className="p-4">Último Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {clientStats.map(row => (
                    <tr key={row.id}>
                      <td className="p-4"><span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.email}</span></td>
                      <td className="p-4 text-center font-bold" style={{ color: 'var(--color-text)' }}>{row.total}</td>
                      <td className="p-4 text-center text-blue-400">{row.open}</td>
                      <td className="p-4 text-center text-amber-400">{row.inProgress}</td>
                      <td className="p-4 text-center text-emerald-400">{row.resolved}</td>
                      <td className="p-4 text-center text-rose-400">{row.high}</td>
                      <td className="p-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>{row.lastTicket ? new Date(row.lastTicket).toLocaleString('es') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {managerTab === 'staff' && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {staffStats.length === 0 ? (
            <p className="p-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No hay agentes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b text-xs uppercase" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th className="p-4">Staff</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4 text-center">Asignados</th>
                    <th className="p-4 text-center">En Curso</th>
                    <th className="p-4 text-center">Resueltos</th>
                    <th className="p-4 text-center">% Resol.</th>
                    <th className="p-4 text-center">Prom. Cierre</th>
                    <th className="p-4 text-center">Alta Prior.</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {staffStats.map(row => (
                    <tr key={row.id}>
                      <td className="p-4">
                        <span className="font-medium" style={{ color: 'var(--color-text)' }}>{row.email}</span>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Carga: {row.activeLoad} en progreso</p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{
                          backgroundColor: row.role === 'Admin' ? 'rgba(168,85,247,0.1)' : 'rgba(245,158,11,0.1)',
                          color: row.role === 'Admin' ? '#a78bfa' : '#f59e0b',
                        }}>{row.role}</span>
                      </td>
                      <td className="p-4 text-center font-bold" style={{ color: 'var(--color-text)' }}>{row.assigned}</td>
                      <td className="p-4 text-center text-amber-400">{row.inProgress}</td>
                      <td className="p-4 text-center text-emerald-400">{row.resolved}</td>
                      <td className="p-4 text-center">
                        <span style={{ color: row.resolutionRate >= 70 ? '#10b981' : row.resolutionRate >= 40 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                          {row.assigned > 0 ? `${row.resolutionRate}%` : '—'}
                        </span>
                      </td>
                      <td className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatHours(row.avgResolve)}</td>
                      <td className="p-4 text-center text-rose-400">{row.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
