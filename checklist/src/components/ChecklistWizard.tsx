'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, CircleDot, Eye, AlertOctagon, Wrench, Truck,
  CheckCircle, AlertTriangle, Send, UploadCloud,
  FileText, ChevronRight, ChevronLeft, Check, XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  SECTIONS, GENERAL_PHOTOS, STEPS, BLOCKING_ITEMS, FUEL_LEVELS,
  type FuelLevel,
} from '@/lib/checklistData';
import {
  getCheckSession,
  clearCheckSession,
  type CheckSession,
  type SubmitInspectionResponse,
} from '@/lib/checkSession';
import SignatureCanvas from '@/components/SignatureCanvas';
import FaultPhoto from '@/components/FaultPhoto';
import AppHeader from '@/components/AppHeader';

interface ItemState {
  value: boolean | null;
  descripcion: string;
  fotoFile: File | null;
  fotoGeo: string;
}

type InspectionMap = Record<string, ItemState>;

function buildInitialInspection(): InspectionMap {
  const map: InspectionMap = {};
  SECTIONS.forEach(section =>
    section.items.forEach(item => {
      map[item.key] = { value: null, descripcion: '', fotoFile: null, fotoGeo: '' };
    })
  );
  return map;
}

const sectionIcon = (id: string) => {
  const map: Record<string, React.ReactNode> = {
    seguridad_activa: <Shield size={22} />,
    neumaticos:       <CircleDot size={22} />,
    visibilidad:      <Eye size={22} />,
    emergencia:       <AlertOctagon size={22} />,
    mecanica:         <Wrench size={22} />,
    gestion_vial:     <Truck size={22} />,
  };
  return map[id] ?? <CheckCircle size={22} />;
};

export default function ChecklistWizard() {
  const router = useRouter();
  const [session, setSession] = useState<CheckSession | null>(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().substring(0, 5),
    kilometraje: '',
    observaciones: '',
  });
  const [nivelCombustible, setNivelCombustible] = useState<FuelLevel | ''>('');
  const [inspection, setInspection] = useState<InspectionMap>(buildInitialInspection);
  const [generalPhotos, setGeneralPhotos] = useState<Record<string, File | null>>(() => {
    const m: Record<string, File | null> = {};
    GENERAL_PHOTOS.forEach(p => (m[p] = null));
    return m;
  });
  const [signature, setSignature] = useState<string | null>(null);
  const [aceptoEnvio, setAceptoEnvio] = useState(false);
  const [includeGestionVial, setIncludeGestionVial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const s = getCheckSession();
    if (!s) {
      router.replace('/check');
      return;
    }
    setSession(s);
  }, [router]);

  const activeSteps = STEPS.filter(s => s.id !== 'gestion_vial' || includeGestionVial);
  const activeSections = SECTIONS.filter(s => s.id !== 'gestion_vial' || includeGestionVial);

  const lastKilometraje = session?.vehiculo.km_actual ?? null;
  const currentKm = Number(formData.kilometraje);
  const isKmValid = !formData.kilometraje || lastKilometraje === null || currentKm > lastKilometraje;

  const hasBadBlocking = SECTIONS.flatMap(s => s.items)
    .filter(i => BLOCKING_ITEMS.has(i.label))
    .some(i => inspection[i.key]?.value === false);

  const resultadoFinal = hasBadBlocking ? 'Vehículo No Apto para Operar' : 'Vehículo Apto';

  const stepComplete = useCallback((stepIdx: number): boolean => {
    const step = activeSteps[stepIdx];
    if (!step) return true;
    if (step.id === 'identificacion') {
      return !!(formData.kilometraje && isKmValid);
    }
    // Fotos generales opcionales (0–4)
    if (step.id === 'fotos') return true;
    if (step.id === 'cierre') return !!signature && aceptoEnvio;
    const sec = SECTIONS.find(s => s.id === step.id);
    if (!sec) return true;
    return sec.items.every(i => {
      const st = inspection[i.key];
      if (st.value === null) return false;
      if (st.value === false) return !!(st.descripcion.trim() && st.fotoFile);
      return true;
    });
  }, [formData, isKmValid, inspection, signature, aceptoEnvio, activeSteps]);

  const allComplete = activeSteps.every((_, i) => stepComplete(i));

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const setItemValue = (key: string, value: boolean) => {
    setInspection(p => ({ ...p, [key]: { ...p[key], value } }));
  };

  const setItemDesc = (key: string, descripcion: string) => {
    setInspection(p => ({ ...p, [key]: { ...p[key], descripcion } }));
  };

  const setItemPhoto = (key: string, fotoFile: File | null, fotoGeo: string) => {
    setInspection(p => ({ ...p, [key]: { ...p[key], fotoFile, fotoGeo } }));
  };

  const handleGenPhoto = (label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setGeneralPhotos(p => ({ ...p, [label]: file }));
  };

  const uploadFile = async (path: string, file: File): Promise<string> => {
    const { error } = await supabase.storage.from('vehicle-photos').upload(path, file, { upsert: true });
    if (error) throw new Error(`Error al subir foto: ${error.message}`);
    const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allComplete || !session) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const ts = Date.now();
      const patente = session.vehiculo.patente;

      const genUrls: Record<string, string> = {};
      for (const [label, file] of Object.entries(generalPhotos)) {
        if (file) {
          genUrls[label] = await uploadFile(
            `general/${patente}-${ts}-${label.replace(/ /g, '')}.jpg`,
            file
          );
        }
      }

      let firmaUrl = '';
      if (signature) {
        const blob = await (await fetch(signature)).blob();
        const sigFile = new File([blob], 'firma.png', { type: 'image/png' });
        firmaUrl = await uploadFile(`firmas/${patente}-${ts}-firma.png`, sigFile);
      }

      const detailRows = [];
      for (const section of activeSections) {
        for (const item of section.items) {
          const st = inspection[item.key];
          let fotoUrl: string | null = null;
          if (st.fotoFile) {
            fotoUrl = await uploadFile(
              `hallazgos/${patente}-${ts}-${item.key}.jpg`,
              st.fotoFile
            );
          }
          detailRows.push({
            seccion: section.title,
            item_key: item.key,
            item_label: item.label,
            is_good: st.value,
            descripcion: st.descripcion || null,
            foto_url: fotoUrl,
            geotag: st.fotoGeo || null,
            is_blocking: BLOCKING_ITEMS.has(item.label),
          });
        }
      }

      const payload = {
        fecha: formData.fecha,
        hora: formData.hora,
        responsable_inspeccion: session.trabajador.nombre,
        cargo: session.trabajador.cargo,
        patente: session.vehiculo.patente,
        kilometraje: currentKm,
        marca_modelo: `${session.vehiculo.marca} ${session.vehiculo.modelo}`,
        anio: session.vehiculo.anio,
        observaciones: formData.observaciones,
        resultado: resultadoFinal,
        firma_url: firmaUrl,
        foto_frontal: genUrls['Frontal'] ?? null,
        foto_trasera: genUrls['Trasera'] ?? null,
        foto_lateral_der: genUrls['Lateral Derecho'] ?? null,
        foto_lateral_izq: genUrls['Lateral Izquierdo'] ?? null,
        nivel_combustible: nivelCombustible || null,
        details: detailRows,
      };

      const { data, error: rpcError } = await supabase.rpc('check_submit_inspection', {
        p_session_token: session.sessionToken,
        p_payload: payload,
      });

      if (rpcError) throw new Error(rpcError.message);

      const res = data as SubmitInspectionResponse;
      if (!res.ok) throw new Error(res.error ?? 'Error al guardar inspección');

      clearCheckSession();
      setStatusMessage({ type: 'success', text: `Inspección enviada. Resultado: ${res.resultado}` });
      setCurrentStep(0);
      window.scrollTo(0, 0);

      setTimeout(() => router.replace('/check'), 4000);
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al enviar. Verifique su conexión.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return <div className="app-shell"><p className="access-intro" style={{ padding: '2rem' }}>Cargando…</p></div>;
  }

  const renderIdentification = () => (
    <div className="step-body">
      <div className="session-summary">
        <div><strong>Responsable:</strong> {session.trabajador.nombre}</div>
        <div><strong>Cargo:</strong> {session.trabajador.cargo}</div>
        <div><strong>Vehículo:</strong> {session.vehiculo.patente} — {session.vehiculo.marca} {session.vehiculo.modelo} ({session.vehiculo.anio})</div>
      </div>

      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Fecha</label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            readOnly
            aria-readonly="true"
            className="input-readonly"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Hora</label>
          <input
            type="time"
            name="hora"
            value={formData.hora}
            readOnly
            aria-readonly="true"
            className="input-readonly"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Kilometraje
            <span className="label-hint">Último: {lastKilometraje?.toLocaleString()}</span>
          </label>
          <input type="number" name="kilometraje" value={formData.kilometraje} onChange={handleInput}
            inputMode="numeric" enterKeyHint="done" placeholder="Ej. 125000"
            className={!isKmValid ? 'is-invalid' : ''} required />
          {!isKmValid && formData.kilometraje && (
            <span className="invalid-feedback">Debe ser mayor a {lastKilometraje?.toLocaleString()}.</span>
          )}
        </div>
      </div>

      <div className="form-group full-width">
        <label className="form-label">
          Nivel de combustible
          <span className="label-hint">Opcional</span>
        </label>
        <div className="fuel-level-btns" role="group" aria-label="Nivel de combustible">
          {FUEL_LEVELS.map(level => (
            <button
              key={level}
              type="button"
              className={`fuel-level-btn ${nivelCombustible === level ? 'active' : ''}`}
              onClick={() => setNivelCombustible(prev => (prev === level ? '' : level))}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group full-width">
        <div className="gestion-vial-toggle-card">
          <div className="toggle-info">
            <Truck size={24} className="text-primary" />
            <div>
              <strong>Inspección de Gestión Vial</strong>
              <p>Requisitos adicionales de faena minera (aire, GPS, carga, etc.)</p>
            </div>
          </div>
          <div className="toggle-switch">
            <input type="checkbox" id="gv-toggle" checked={includeGestionVial}
              onChange={e => setIncludeGestionVial(e.target.checked)} />
            <label htmlFor="gv-toggle"></label>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .session-summary {
          background: #f0f7ff; border: 1px solid #c2e0ff; border-radius: 1rem;
          padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.35rem;
          font-size: 0.9rem;
        }
        .gestion-vial-toggle-card {
          display: flex; align-items: center; justify-content: space-between; gap: 1rem;
          padding: 1.25rem; background: #f0f7ff; border: 1px solid #c2e0ff; border-radius: 1rem;
        }
        .toggle-info { display: flex; gap: 1rem; align-items: center; flex: 1; min-width: 0; }
        .toggle-info p { margin: 0; font-size: 0.85rem; color: #4b5563; }
        .toggle-switch { position: relative; width: 50px; height: 26px; flex-shrink: 0; }
        @media (max-width: 480px) {
          .gestion-vial-toggle-card { padding: 1rem; }
          .toggle-info { gap: .75rem; }
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-switch label {
          position: absolute; cursor: pointer; inset: 0;
          background: #cbd5e1; transition: .4s; border-radius: 34px;
        }
        .toggle-switch label:before {
          content: ""; position: absolute; height: 18px; width: 18px; left: 4px; bottom: 4px;
          background: white; transition: .4s; border-radius: 50%;
        }
        .toggle-switch input:checked + label { background: var(--blue); }
        .toggle-switch input:checked + label:before { transform: translateX(24px); }
      ` }} />
    </div>
  );

  const renderCheckSection = (sectionId: string) => {
    const sec = SECTIONS.find(s => s.id === sectionId);
    if (!sec) return null;
    return (
      <div className="step-body">
        {sec.items.map(item => {
          const st = inspection[item.key];
          const isBad = st.value === false;
          const isGood = st.value === true;
          const isBlock = BLOCKING_ITEMS.has(item.label);
          const needsEvidence = isBad && (!st.descripcion.trim() || !st.fotoFile);
          return (
            <div key={item.key}
              className={`check-row ${isBad ? 'check-row--bad' : ''} ${isBlock && isBad ? 'check-row--blocking' : ''}`}>
              <div className="check-row-header">
                <div className="check-row-title">
                  {isBlock && <span className="blocking-badge">⚠ Bloqueante</span>}
                  <span>{item.label}</span>
                </div>
                <div className="binary-btns">
                  <button type="button" className={`bin-btn bin-btn--good ${isGood ? 'active' : ''}`}
                    onClick={() => setItemValue(item.key, true)}>
                    <Check size={16} /> Bueno
                  </button>
                  <button type="button" className={`bin-btn bin-btn--bad ${isBad ? 'active' : ''}`}
                    onClick={() => setItemValue(item.key, false)}>
                    <XCircle size={16} /> Malo
                  </button>
                </div>
              </div>
              {isBad && (
                <div className="fault-details">
                  <textarea className={`fault-desc ${!st.descripcion.trim() ? 'is-invalid' : ''}`}
                    rows={2} placeholder="Describa el hallazgo (obligatorio)…"
                    value={st.descripcion} onChange={e => setItemDesc(item.key, e.target.value)} />
                  <FaultPhoto itemKey={item.key} hint={item.hint}
                    onPhotoChange={(file, geo) => setItemPhoto(item.key, file, geo)} />
                  {needsEvidence && (
                    <p className="fault-warning">
                      <AlertTriangle size={14} /> Descripción y foto del hallazgo son obligatorias.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderGeneralPhotos = () => (
    <div className="step-body">
      <p className="gen-photo-hint">Puede omitir fotos. Orden sugerido: izquierda, trasera, derecha y frontal.</p>
      <div className="gen-photo-grid">
        {GENERAL_PHOTOS.map(label => {
          const file = generalPhotos[label];
          const previewUrl = file ? URL.createObjectURL(file) : null;
          return (
            <label key={label} className={`gen-photo-card ${file ? 'has-file' : ''}`}>
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                onChange={e => handleGenPhoto(label, e)} />
              {previewUrl ? (
                <img src={previewUrl} alt={label} className="gen-photo-preview" />
              ) : (
                <UploadCloud size={36} className="gen-photo-icon" />
              )}
              <span className="gen-photo-label">{label}</span>
              {file ? <span className="gen-photo-ok">✓ Cargada</span> : <span className="gen-photo-req">Opcional</span>}
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderClosure = () => (
    <div className="step-body">
      {hasBadBlocking ? (
        <div className="resultado-noapto">
          <AlertTriangle size={24} />
          <div>
            <strong>Vehículo No Apto para Operar</strong>
            <p>Fallas en ítems críticos. No puede operar hasta revisión.</p>
          </div>
        </div>
      ) : (
        <div className="resultado-apto">
          <CheckCircle size={24} />
          <strong>Vehículo Apto</strong>
        </div>
      )}
      <div className="form-group" style={{ marginTop: '1.5rem' }}>
        <label className="form-label">Observaciones (opcional)</label>
        <textarea name="observaciones" value={formData.observaciones} onChange={handleInput}
          rows={4} placeholder="Notas adicionales…" />
      </div>
      <div className="form-group">
        <label className="form-label">Firma digital</label>
        <SignatureCanvas onSignatureChange={setSignature} />
        {!signature && <span className="invalid-feedback">La firma es obligatoria.</span>}
      </div>
      <div className="acepto-box">
        <input type="checkbox" id="acepto-envio" checked={aceptoEnvio}
          onChange={e => setAceptoEnvio(e.target.checked)} className="acepto-checkbox" />
        <label htmlFor="acepto-envio" className="acepto-label">
          Declaro que los datos registrados son verídicos.
        </label>
      </div>
    </div>
  );

  const renderStepContent = () => {
    const stepId = activeSteps[currentStep].id;
    if (stepId === 'identificacion') return renderIdentification();
    if (stepId === 'fotos') return renderGeneralPhotos();
    if (stepId === 'cierre') return renderClosure();
    return renderCheckSection(stepId);
  };

  const isLastStep = currentStep === activeSteps.length - 1;
  const canAdvance = stepComplete(currentStep);

  return (
    <div className="app-shell">
      <AppHeader
        subtitle={`${session.vehiculo.patente} · ${session.trabajador.nombre}`}
        badge={hasBadBlocking ? (
          <div className="header-alert-badge"><AlertTriangle size={16} /> No Apto</div>
        ) : undefined}
      />

      <nav className="stepper" aria-label="pasos">
        {activeSteps.map((step, i) => (
          <button key={step.id} type="button"
            className={`stepper-step ${i === currentStep ? 'active' : ''} ${stepComplete(i) ? 'done' : ''}`}
            onClick={() => setCurrentStep(i)}>
            <span className="stepper-num">{stepComplete(i) ? <Check size={14} /> : i + 1}</span>
            <span className="stepper-label">{step.label}</span>
          </button>
        ))}
      </nav>

      {statusMessage && (
        <div className={`page-alert page-alert--${statusMessage.type}`}>
          {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {statusMessage.text}
        </div>
      )}

      <main className="step-card">
        <div className="step-card-header">
          <span className="step-card-icon">
            {currentStep < 2 ? <FileText size={22} /> : sectionIcon(activeSteps[currentStep].id)}
          </span>
          <h2 className="step-card-title">{activeSteps[currentStep].label}</h2>
          <span className="step-counter">{currentStep + 1} / {activeSteps.length}</span>
        </div>

        <form onSubmit={handleSubmit}>
          {renderStepContent()}
          <div className="step-nav">
            <button type="button" className="btn btn-outline"
              onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 0}>
              <ChevronLeft size={18} /> Anterior
            </button>
            {!isLastStep ? (
              <button type="button" className="btn btn-primary"
                onClick={() => setCurrentStep(p => p + 1)} disabled={!canAdvance}>
                Siguiente <ChevronRight size={18} />
              </button>
            ) : (
              <button type="submit" className="btn btn-action" disabled={!allComplete || loading}>
                {loading ? 'Enviando…' : <><Send size={18} /> Enviar inspección</>}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
