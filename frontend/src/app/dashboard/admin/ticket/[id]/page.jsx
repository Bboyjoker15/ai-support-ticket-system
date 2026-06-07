'use client';

import { Suspense } from 'react';
import TicketAgentDetail from '@/components/TicketAgentDetail';

function AdminTicketDetailContent() {
  return <TicketAgentDetail variant="admin" />;
}

export default function AdminTicketDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Cargando ticket…
        </div>
      }
    >
      <AdminTicketDetailContent />
    </Suspense>
  );
}
