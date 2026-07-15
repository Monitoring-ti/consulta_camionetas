import { Suspense } from 'react';
import AccessGate from '@/components/AccessGate';

export default function CheckPage() {
  return (
    <Suspense fallback={
      <div className="app-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ color: '#64748b' }}>Cargando identificador...</div>
      </div>
    }>
      <AccessGate />
    </Suspense>
  );
}
