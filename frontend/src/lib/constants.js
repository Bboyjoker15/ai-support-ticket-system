import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react';

export const menuItems = {
  user: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Mis Tickets', href: '/dashboard/user', icon: Ticket },
    { label: 'Nuevo Ticket', href: '/dashboard/user', icon: PlusCircle, params: '?new=true' },
  ],
  agent: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Todos los Tickets', href: '/dashboard/agent', icon: ClipboardList },
    { label: 'Mis Tickets', href: '/dashboard/agent', icon: Ticket, params: '?mine=true' },
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Tickets', href: '/dashboard/admin', icon: ClipboardList },
    { label: 'Analíticas', href: '/dashboard/admin', icon: BarChart3, params: '?analytics=true' },
    { label: 'Agentes', href: '/dashboard/admin', icon: Users, params: '?agents=true' },
    { label: 'Configuración', href: '/dashboard/admin', icon: Settings, params: '?settings=true' },
  ],
};

export const roleColors = {
  Admin: 'purple',
  Agent: 'amber',
  User: 'blue',
};
