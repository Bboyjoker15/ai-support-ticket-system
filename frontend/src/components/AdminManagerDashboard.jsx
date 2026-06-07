'use client';

import { useMemo, useState } from 'react';

function isWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

function avgHoursToResolve(tickets) {
  const resolved = tickets.filter(
    (t) => t.status === 'Resolved' && t.created_at && t.updated_at
  );
  if (resolved.length === 0) return null;
  const totalHours = resolved.reduce((sum, t) => {
    const h =
      (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) /
      (1000 * 60 * 60);
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

function MetricBar({ label, value, total, colorClass }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">
          {value} <span className="text-slate-600">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminManagerDashboard({ users = [], tickets = [], userEmailById = {} }) {
  const [managerTab, setManagerTab] = useState('global');

  const globalMetrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'Open').length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
    const resolved = tickets.filter((t) => t.status === 'Resolved').length;
    const unassigned = tickets.filter((t) => !t.assigned_to && t.status !== 'Resolved').length;
    const high = tickets.filter((t) => t.ai_priority === 'High').length;
    const medium = tickets.filter((t) => t.ai_priority === 'Medium').length;
    const low = tickets.filter((t) => t.ai_priority?.toLowerCase() === 'low').length;
    const last24h = tickets.filter((t) => isWithinDays(t.created_at, 1)).length;
    const last7d = tickets.filter((t) => isWithinDays(t.created_at, 7)).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const avgResolve = avgHoursToResolve(tickets);
    const openHigh = tickets.filter(
      (t) => t.ai_priority === 'High' && t.status !== 'Resolved'
    ).length;

    return {
      total,
      open,
      inProgress,
      resolved,
      unassigned,
      high,
      medium,
      low,
      last24h,
      last7d,
      resolutionRate,
      avgResolve,
      openHigh,
      agents: users.filter((u) => u.role === 'Agent').length,
      clients: users.filter((u) => u.role === 'User').length,
      admins: users.filter((u) => u.role === 'Admin').length,
    };
  }, [tickets, users]);

  const clientStats = useMemo(() => {
    return users
      .filter((u) => u.role === 'User')
      .map((u) => {
        const mine = tickets.filter((t) => t.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          total: mine.length,
          open: mine.filter((t) => t.status === 'Open').length,
          inProgress: mine.filter((t) => t.status === 'In Progress').length,
          resolved: mine.filter((t) => t.status === 'Resolved').length,
          high: mine.filter((t) => t.ai_priority === 'High').length,
          lastTicket: mine[0]?.created_at || null,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [users, tickets]);

  const staffStats = useMemo(() => {
    const staff = users.filter((u) => u.role === 'Agent' || u.role === 'Admin');
    return staff
      .map((u) => {
        const assigned = tickets.filter((t) => t.assigned_to === u.id);
        const resolved = assigned.filter((t) => t.status === 'Resolved');
        return {
          id: u.id,
          email: u.email,
          role: u.role,
          assigned: assigned.length,
          open: assigned.filter((t) => t.status === 'Open').length,
          inProgress: assigned.filter((t) => t.status === 'In Progress').length,
          resolved: resolved.length,
          high: assigned.filter((t) => t.ai_priority === 'High').length,
          resolutionRate:
            assigned.length > 0
              ? Math.round((resolved.length / assigned.length) * 100)
              : 0,
          avgResolve: avgHoursToResolve(assigned),
          activeLoad: assigned.filter((t) => t.status === 'In Progress').length,
        };
      })
      .sort((a, b) => b.assigned - a.assigned);
  }, [users, tickets]);

  const tabs = [
    { id: 'global', label: 'Plataforma' },
    { id: 'clients', label: 'Por cliente' },
    { id: 'staff', label: 'Por agente / admin' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Centro de métricas (Manager)
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Vista ejecutiva integrada en el panel admin: rendimiento global, clientes y
          carga de cada agente. Se actualiza en tiempo real con los tickets del sistema.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setManagerTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              managerTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {managerTab === 'global' && (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
              Indicadores clave (KPI)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: 'Tickets totales', value: globalMetrics.total, c: 'text-white' },
                { label: 'Tasa resolución', value: `${globalMetrics.resolutionRate}%`, c: 'text-emerald-400' },
                { label: 'Tiempo prom. resolución', value: formatHours(globalMetrics.avgResolve), c: 'text-cyan-400' },
                { label: 'Sin asignar (activos)', value: globalMetrics.unassigned, c: 'text-orange-400' },
                { label: 'Alta prioridad abiertos', value: globalMetrics.openHigh, c: 'text-rose-400' },
                { label: 'Últimas 24 h', value: globalMetrics.last24h, c: 'text-blue-400' },
                { label: 'Últimos 7 días', value: globalMetrics.last7d, c: 'text-indigo-400' },
                { label: 'Usuarios en plataforma', value: users.length, c: 'text-purple-400' },
              ].map((k) => (
                <div
                  key={k.label}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
                >
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">{k.label}</p>
                  <p className={`text-xl font-bold mt-1 ${k.c}`}>{k.value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Distribución por estado</h3>
              <MetricBar label="Abiertos" value={globalMetrics.open} total={globalMetrics.total} colorClass="bg-blue-500" />
              <MetricBar label="En progreso" value={globalMetrics.inProgress} total={globalMetrics.total} colorClass="bg-amber-500" />
              <MetricBar label="Resueltos" value={globalMetrics.resolved} total={globalMetrics.total} colorClass="bg-emerald-500" />
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Distribución por prioridad IA</h3>
              <MetricBar label="Alta" value={globalMetrics.high} total={globalMetrics.total} colorClass="bg-rose-500" />
              <MetricBar label="Media" value={globalMetrics.medium} total={globalMetrics.total} colorClass="bg-amber-500" />
              <MetricBar label="Baja" value={globalMetrics.low} total={globalMetrics.total} colorClass="bg-emerald-500" />
            </section>
          </div>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Equipo registrado</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-2xl font-bold text-purple-400">{globalMetrics.admins}</p>
                <p className="text-[10px] text-slate-500 uppercase mt-1">Admins</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-2xl font-bold text-amber-400">{globalMetrics.agents}</p>
                <p className="text-[10px] text-slate-500 uppercase mt-1">Agentes</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-400">{globalMetrics.clients}</p>
                <p className="text-[10px] text-slate-500 uppercase mt-1">Clientes</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {managerTab === 'clients' && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Métricas por cliente (User)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tickets reportados por cada cuenta de cliente.
            </p>
          </div>
          {clientStats.length === 0 ? (
            <p className="p-8 text-center text-slate-500 text-sm">No hay clientes registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/50">
                    <th className="p-4">Cliente</th>
                    <th className="p-4 text-center">Total</th>
                    <th className="p-4 text-center">Open</th>
                    <th className="p-4 text-center">In Progress</th>
                    <th className="p-4 text-center">Resolved</th>
                    <th className="p-4 text-center">Alta prior.</th>
                    <th className="p-4">Último ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {clientStats.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-950/30">
                      <td className="p-4">
                        <p className="font-medium text-white">{row.email}</p>
                        <p className="text-[10px] font-mono text-slate-600">{row.id.slice(0, 8)}…</p>
                      </td>
                      <td className="p-4 text-center font-bold text-white">{row.total}</td>
                      <td className="p-4 text-center text-blue-400">{row.open}</td>
                      <td className="p-4 text-center text-amber-400">{row.inProgress}</td>
                      <td className="p-4 text-center text-emerald-400">{row.resolved}</td>
                      <td className="p-4 text-center text-rose-400">{row.high}</td>
                      <td className="p-4 text-xs text-slate-500">
                        {row.lastTicket
                          ? new Date(row.lastTicket).toLocaleString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {managerTab === 'staff' && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Métricas por agente y administrador</h3>
            <p className="text-xs text-slate-500 mt-1">
              Carga y desempeño según tickets con{' '}
              <code className="text-purple-400">assigned_to</code>.
            </p>
          </div>
          {staffStats.length === 0 ? (
            <p className="p-8 text-center text-slate-500 text-sm">
              No hay agentes ni admins en el sistema.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 border-b border-slate-800 bg-slate-950/50">
                    <th className="p-4">Personal</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4 text-center">Asignados</th>
                    <th className="p-4 text-center">En curso</th>
                    <th className="p-4 text-center">Resueltos</th>
                    <th className="p-4 text-center">% Resolución</th>
                    <th className="p-4 text-center">Prom. cierre</th>
                    <th className="p-4 text-center">Alta prior.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {staffStats.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-950/30">
                      <td className="p-4">
                        <p className="font-medium text-white">{row.email}</p>
                        <p className="text-[10px] text-slate-600">
                          Carga activa: {row.activeLoad} en progreso
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs font-mono px-2 py-0.5 rounded border ${
                            row.role === 'Admin'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {row.role}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold">{row.assigned}</td>
                      <td className="p-4 text-center text-amber-400">{row.inProgress}</td>
                      <td className="p-4 text-center text-emerald-400">{row.resolved}</td>
                      <td className="p-4 text-center">
                        <span
                          className={
                            row.resolutionRate >= 70
                              ? 'text-emerald-400 font-bold'
                              : row.resolutionRate >= 40
                                ? 'text-amber-400'
                                : 'text-slate-400'
                          }
                        >
                          {row.assigned > 0 ? `${row.resolutionRate}%` : '—'}
                        </span>
                      </td>
                      <td className="p-4 text-center text-cyan-400 text-xs">
                        {formatHours(row.avgResolve)}
                      </td>
                      <td className="p-4 text-center text-rose-400">{row.high}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {staffStats.some((s) => s.assigned === 0) && (
            <p className="p-4 text-xs text-slate-500 border-t border-slate-800">
              El personal sin tickets asignados aún no acumula métricas de resolución.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
