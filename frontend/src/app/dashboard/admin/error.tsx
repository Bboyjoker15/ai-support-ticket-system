'use client';

export default function AdminError({ reset }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        No se pudieron cargar los datos del panel.
      </p>
      <button
        onClick={reset}
        className="mt-4 text-sm font-medium text-indigo-500 hover:text-indigo-400 transition-colors"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
