'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Truck, User, AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatRutInput, isValidRut, normalizeRut } from '@/lib/rut';
import {
  formatPatenteDisplay,
  isValidPatenteChilena,
  normalizePatente,
} from '@/lib/patente';
import {
  saveCheckSession,
  type ValidateAccessResponse,
} from '@/lib/checkSession';
import AppHeader from '@/components/AppHeader';

export default function AccessGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rut, setRut] = useState('');
  const [patente, setPatente] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rutInputRef = useRef<HTMLInputElement>(null);

  const rutOk = isValidRut(rut);
  const patenteOk = isValidPatenteChilena(patente);
  const canSubmit = rutOk && patenteOk && !loading;

  useEffect(() => {
    const p = searchParams?.get('patente');
    if (p) {
      setPatente(formatPatenteDisplay(p));
      // Focus RUT input on mount if patente is prefilled
      setTimeout(() => {
        rutInputRef.current?.focus();
      }, 150);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc('check_validate_access', {
      p_rut: normalizeRut(rut),
      p_patente: normalizePatente(patente),
    });

    if (rpcError) {
      setError('Error de conexión. Intente nuevamente.');
      setLoading(false);
      return;
    }

    const res = data as ValidateAccessResponse;

    if (!res.ok || !res.session_token || !res.trabajador || !res.vehiculo) {
      setError(res.error ?? 'Acceso denegado');
      setLoading(false);
      return;
    }

    saveCheckSession({
      sessionToken: res.session_token,
      expiresAt: res.expires_at!,
      trabajador: res.trabajador,
      vehiculo: res.vehiculo,
    });

    router.push('/check/inspeccion');
  }

  return (
    <div className="app-shell">
      <AppHeader subtitle="Inspección de camioneta en terreno · Check ECF 4" />

      <main className="step-card access-card">
        <div className="step-card-header">
          <span className="step-card-icon"><User size={22} /></span>
          <h2 className="step-card-title">Identificación</h2>
        </div>

        <form className="step-body" onSubmit={handleSubmit}>
          <p className="access-intro">
            Ingrese su RUT y la patente del vehículo a inspeccionar.
            Solo personal y vehículos registrados pueden continuar.
          </p>

          {error && (
            <div className="page-alert page-alert--error">
              <AlertTriangle size={20} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="rut">RUT del responsable</label>
            <input
              id="rut"
              ref={rutInputRef}
              type="text"
              inputMode="numeric"
              enterKeyHint="next"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="12.345.678-9"
              value={rut}
              onChange={(e) => setRut(formatRutInput(e.target.value))}
              className={rut && !rutOk ? 'is-invalid' : ''}
              required
            />
            {rut && !rutOk && (
              <span className="invalid-feedback">RUT inválido</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="patente">
              <Truck size={16} /> Patente del vehículo
            </label>
            <input
              id="patente"
              type="text"
              inputMode="text"
              enterKeyHint="go"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              placeholder="ABCD-12"
              value={patente}
              onChange={(e) => setPatente(formatPatenteDisplay(e.target.value))}
              className={patente && !patenteOk ? 'is-invalid' : ''}
              required
            />
            {patente && !patenteOk && (
              <span className="invalid-feedback">
                Formato: XXXX-XX (4 letras + 2 números)
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={!canSubmit}>
            {loading ? 'Validando…' : <>Continuar a inspección <ChevronRight size={18} /></>}
          </button>
        </form>
      </main>
    </div>
  );
}
