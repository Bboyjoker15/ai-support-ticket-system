'use client';

import { Suspense } from 'react';
import TicketAgentDetail from '@/components/TicketAgentDetail';

function AgentTicketDetailContent() {
  return <TicketAgentDetail variant="agent" />;
}

export default function AgentTicketDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Cargando ticket…
        </div>
      }
    >
      <AgentTicketDetailContent />
    </Suspense>
  );
}
