'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
// 1️⃣ Importamos el nuevo componente de mensajes
import MessageBell from '@/components/MessageBell';

export default function AgentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tickets, setTickets] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  
  // Estado para controlar la pestaña activa: 'global' o 'mine'
  const [activeTab, setActiveTab] = useState('global');
  
  // Estado para controlar el filtro de prioridad activo
  const [priorityFilter, setPriorityFilter] = useState('All');

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(true);
      } else if (data) {
        setTickets(data);
        setFetchError(false);
      }
    } catch (err) {
      setFetchError(true);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user: authedUser }, error } = await supabase.auth.getUser();
        if (error || !authedUser) {
          router.push('/login');
          return;
        }
        setUser(authedUser);
        fetchTickets();
      } catch (err) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    const canal = supabase
      .channel('cambios-globales-agent')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'tickets' 
        },
        () => {
          fetchTickets();
        }
      );

    canal.subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // Función optimizada para actualización instantánea (Optimistic Update) y Auto-asignación
  const handleUpdateStatus = async (ticketId, newStatus) => {
    const shouldAssign = newStatus === 'In Progress';

    setTickets((prevTickets) =>
      prevTickets.map((t) =>
        t.id === ticketId 
          ? { ...t, status: newStatus, assigned_to: shouldAssign ? user?.id : t.assigned_to } 
          : t
      )
    );

    try {
      const updateData = { status: newStatus };
      if (shouldAssign) {
        updateData.assigned_to = user?.id;
      }

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // FILTRADO SEGURO DE TICKETS
  const displayedTickets = tickets.filter((ticket) => {
    const matchesTab = activeTab === 'mine'
      ? ticket.assigned_to === user?.id
      : !ticket.assigned_to || ticket.assigned_to === user?.id;

    const matchesPriority = priorityFilter === 'All'
      ? true
      : ticket.ai_priority?.toLowerCase() === priorityFilter.toLowerCase();

    return matchesTab && matchesPriority;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col gap-4 items-center justify-center text-white font-medium">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm text-slate-400 tracking-wide animate-pulse">Sincronizando consola global...</span>
      </div>
    );
  }

  // Extracción de los IDs de tickets asignados al agente
  const assignedTicketIds = tickets
    .filter((ticket) => ticket.assigned_to === user?.id)
    .map((ticket) => ticket.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <header className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Mesa de Operaciones Técnicas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Agente activo: {user?.email} <span className="text-xs bg-amber-950 text-amber-400 ml-2 px-2 py-0.5 rounded-md font-mono border border-amber-800/60 font-semibold uppercase">Agent</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Tu campana original de alertas críticas */}
          <NotificationBell 
            userId={user?.id}
            userRole="agent"
            assignedTicketIds={assignedTicketIds}
          />

          {/* 2️⃣ Insertamos el nuevo botón de mensajes aquí al lado */}
          <MessageBell 
            userId={user?.id}
            userRole="agent"
            assignedTicketIds={assignedTicketIds}
          />

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-xl text-xs font-semibold uppercase tracking-wider transition text-slate-300"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        
        {/* Contenedor Superior de Controladores */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          
          {/* Selector de Pestañas (Tabs) */}
          <div className="flex space-x-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 w-full md:max-w-md">
            <button
              onClick={() => setActiveTab('global')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'global'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              📥 Bandeja Global
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                activeTab === 'mine'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              👤 Mis Casos Asignados
            </button>
          </div>

          {/* Selector de Botones por Prioridad */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">
              Prioridad:
            </span>
            {[
              { id: 'All', label: 'Todos', activeStyle: 'bg-slate-800 text-white border-slate-600' },
              { id: 'High', label: '🔴 Alta', activeStyle: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-md shadow-rose-950/20' },
              { id: 'Medium', label: '🟡 Media', activeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-md shadow-amber-950/20' },
              { id: 'Low', label: '🟢 Baja', activeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-950/20' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setPriorityFilter(btn.id)}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition active:scale-95 ${
                  priorityFilter === btn.id
                    ? btn.activeStyle
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

        </div>

        <section className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              {activeTab === 'global' ? 'Incidencias Disponibles' : 'Mis Casos en Curso'}
              {priorityFilter !== 'All' && (
                <span className="text-xs font-normal text-slate-500 ml-2">
                  (Filtrado por riesgo {priorityFilter})
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              Casos en esta vista: {displayedTickets.length}
            </span>
          </div>

          {fetchError ? (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center text-rose-400 text-sm">
              Error al sincronizar con Supabase. Por favor, refresca la consola.
            </div>
          ) : displayedTickets.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <p className="text-base font-medium text-slate-400">No hay tickets que coincidan con estos filtros</p>
              <p className="text-xs text-slate-600 mt-1">Prueba cambiando de prioridad o revisando la bandeja opuesta.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayedTickets.map((ticket) => (
                <div key={ticket.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition duration-200 shadow-md">
                  
                  {/* Contenedor Clickable hacia el Detalle del Ticket */}
                  <Link href={`/dashboard/agent/${ticket.id}`} className="group block text-left cursor-pointer">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block mb-0.5">ID: {ticket.id.slice(0, 8)}...</span>
                        <h3 className="font-semibold text-white text-lg group-hover:text-amber-400 transition duration-150">{ticket.title}</h3>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        ticket.status === 'Open' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        ticket.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-5 p-3 bg-slate-950/20 rounded-xl border border-slate-800/40">{ticket.description}</p>
                    
                    <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                      <div className="flex flex-wrap gap-2 text-xs border-b border-slate-800/50 pb-2 justify-between">
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-400 uppercase text-[10px]">Prioridad:</span>
                          <span className={`font-bold ${
                            ticket.ai_priority === 'High' ? 'text-rose-400' :
                            ticket.ai_priority === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>{ticket.ai_priority || 'Pendiente'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-400 uppercase text-[10px]">Riesgo:</span>
                          <span className="text-orange-400 font-bold">{ticket.ai_risk_level || 'Pendiente'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-bold text-slate-400 uppercase text-[10px]">Clasificación:</span>
                          <span className="text-indigo-400 font-semibold">{ticket.ai_classification || 'Pendiente'}</span>
                        </div>
                      </div>

                      {ticket.ai_summary && (
                        <div className="text-xs text-slate-300">
                          <strong className="text-slate-400 font-medium block mb-0.5">Resumen Ejecutivo IA:</strong>
                          <p className="italic text-slate-400">{`"${ticket.ai_summary}"`}</p>
                        </div>
                      )}

                      {ticket.ai_suggestions && (
                        <div className="text-xs text-slate-300 border-t border-slate-800/40 pt-2">
                          <strong className="text-emerald-400 font-medium block mb-0.5">Sugerencias de Resolución:</strong>
                          <p className="text-slate-400">{ticket.ai_suggestions}</p>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Botones de acción externos al Link */}
                  <div className="flex gap-2.5 mt-5 pt-4 border-t border-slate-800/40 justify-end items-center">
                    {ticket.status === 'Open' && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, 'In Progress')}
                        className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 text-xs font-bold rounded-xl transition"
                      >
                        🧑‍💻 Atender Incidencia
                      </button>
                    )}

                    {ticket.status === 'In Progress' && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                        className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl transition"
                      >
                        ✓ Resolver Ticket
                      </button>
                    )}

                    {ticket.status === 'Resolved' && (
                      <div className="text-xs font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-800/50 px-3 py-1.5 rounded-xl uppercase tracking-wider font-mono">
                        🎉 Caso Cerrado
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}