'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
// Importaciones de tus dos campanas de notificaciones en tiempo real
import UserNotificationBell from '@/components/UserNotificationBell';
import UserMessagesBell from '@/components/UserMessagesBell';

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
  
  // Estado para controlar el filtro de estado seleccionado
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchTickets = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', userId)
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
      } catch (err) {
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
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'tickets',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTickets(user.id);
        }
      );

    canal.subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [user?.id, fetchTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setFormLoading(true); 
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.from('tickets').insert([
        {
          user_id: user.id,
          title,
          description,
          status: 'Open'
        }
      ]);

      if (error) throw error;

      setMessage({ 
        text: 'Incidencia enviada correctamente. El motor de IA está calculando la prioridad.', 
        type: 'success' 
      });
      setTitle('');
      setDescription('');
      fetchTickets(user.id);
    } catch (error) {
      setMessage({ 
        text: error.message || 'No se pudo conectar con el servidor de tickets. Inténtalo de nuevo.', 
        type: 'error' 
      });
    } finally {
      setFormLoading(false); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Filtrado del arreglo antes de renderizar
  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter === 'All') return true;
    return ticket.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col gap-4 items-center justify-center text-white font-medium">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm text-slate-400 tracking-wide animate-pulse">Cargando tu panel de soporte...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <header className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Área de Soporte al Cliente
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Usuario: {user?.email} <span className="text-xs bg-blue-950 text-blue-400 ml-2 px-2 py-0.5 rounded-md font-mono border border-blue-800/60 font-semibold uppercase">Client</span>
          </p>
        </div>
        
        {/* Contenedor principal de acciones del encabezado */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Sub-agrupador para mantener ambas campanas juntas */}
          <div className="flex items-center gap-2">
            {/* Campana de Estados (Notificaciones de Cambios de Estado) */}
            <UserNotificationBell userId={user?.id} />
            
            {/* Campana de Mensajes (Notificaciones de Chats Nuevos) */}
            <UserMessagesBell userId={user?.id} />
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-xl text-xs font-semibold uppercase tracking-wider transition text-slate-300"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
        <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
          <h2 className="text-xl font-bold text-white mb-4">Reportar Incidencia</h2>
          
          {message.text && (
            <div className={`p-4 rounded-xl text-sm mb-5 border flex items-start gap-3 transition-all duration-300 ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <span className="mt-0.5 font-bold">{message.type === 'success' ? '✓' : '✕'}</span>
              <p>{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Asunto / Título
              </label>
              <input
                type="text"
                required
                disabled={formLoading}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Falla crítica en autenticación"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Descripción del Problema
              </label>
              <textarea
                required
                rows={5}
                disabled={formLoading}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe detalladamente qué sucede para que la IA asigne la prioridad correcta..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition resize-none disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 font-semibold rounded-xl text-white shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Procesando con IA...</span>
                </>
              ) : (
                <span>Enviar Ticket</span>
              )}
            </button>
          </form>
        </section>

        <section className="lg:col-span-3 space-y-4">
          <h2 className="text-xl font-bold text-white">Mis Tickets Solicitados</h2>

          {fetchError ? (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center text-rose-400 text-sm">
              No se pudieron cargar tus tickets. Por favor, refresca la página.
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 text-xl font-bold mb-4">
                !
              </div>
              <p className="text-base font-medium text-slate-400">No tienes ningún ticket registrado todavía</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Usa el formulario de la izquierda para reportar un problema. Tu historial y el análisis automático aparecerán aquí.
              </p>
            </div>
          ) : (
            <>
              {/* Barra superior de filtros por estado */}
              <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 w-fit">
                <button
                  onClick={() => setStatusFilter('All')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition uppercase ${
                    statusFilter === 'All'
                      ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todos ({tickets.length})
                </button>
                <button
                  onClick={() => setStatusFilter('Open')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition uppercase flex items-center gap-1.5 border border-transparent ${
                    statusFilter === 'Open'
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                  Open ({tickets.filter(t => t.status === 'Open').length})
                </button>
                <button
                  onClick={() => setStatusFilter('In Progress')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition uppercase flex items-center gap-1.5 border border-transparent ${
                    statusFilter === 'In Progress'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                  In Progress ({tickets.filter(t => t.status === 'In Progress').length})
                </button>
                <button
                  onClick={() => setStatusFilter('Resolved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition uppercase flex items-center gap-1.5 border border-transparent ${
                    statusFilter === 'Resolved'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                  Resolved ({tickets.filter(t => t.status === 'Resolved').length})
                </button>
              </div>

              {/* Manejo del estado vacío específico de un filtro */}
              {filteredTickets.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl p-12 text-center text-xs text-slate-500 italic">
                  {`No tienes solicitudes en estado "${statusFilter === 'All' ? 'Todos' : statusFilter}" actualmente.`}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <Link 
                      key={ticket.id} 
                      href={`/dashboard/user/${ticket.id}`}
                      className="block bg-slate-900 border border-slate-800 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 rounded-2xl p-5 transition cursor-pointer group text-left"
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h3 className="font-semibold text-white text-lg group-hover:text-blue-400 transition flex items-center gap-2">
                          {ticket.title}
                          <span className="text-xs opacity-0 group-hover:opacity-100 text-blue-400 transition-all duration-200">
                            (Ver chat ↗)
                          </span>
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          ticket.status === 'Open' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                          ticket.status === 'In Progress' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                          'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-4">{ticket.description}</p>
                      
                      <div className="space-y-2 border-t border-slate-800/60 pt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span>Análisis del Modelo:</span>
                            <span className={`font-semibold ${
                              ticket.ai_priority === 'High' ? 'text-rose-400' : 
                              ticket.ai_priority === 'Medium' || ticket.ai_priority?.includes('Medium') ? 'text-amber-400' : 
                              ticket.ai_priority === 'Low' ? 'text-slate-300' : 
                              ticket.ai_priority ? 'text-slate-400' : 'text-blue-400 animate-pulse'
                            }`}>
                              {ticket.ai_priority ? `Prioridad ${ticket.ai_priority}` : 'Analizando con IA...'}
                            </span>
                          </div>
                          <span className="text-slate-600">
                            {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}
                          </span>
                        </div>

                        {ticket.ai_analysis && (
                          <div className="text-xs bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50 flex items-start gap-1.5 leading-relaxed text-slate-400">
                            <span className="text-blue-400/90 select-none">💡</span>
                            <span>
                              <strong className="text-slate-300 font-medium">Razón de la IA:</strong>{' '}
                              <span className="italic">{ticket.ai_analysis}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}