export interface CheckSessionTrabajador {
  id: string;
  nombre: string;
  cargo: string;
  rut: string;
}

export interface CheckSessionVehiculo {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  km_actual: number;
}

export interface CheckSession {
  sessionToken: string;
  expiresAt: string;
  trabajador: CheckSessionTrabajador;
  vehiculo: CheckSessionVehiculo;
}

const STORAGE_KEY = 'monitoring_check_session';

export function saveCheckSession(session: CheckSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getCheckSession(): CheckSession | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as CheckSession;
    if (new Date(session.expiresAt) <= new Date()) {
      clearCheckSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearCheckSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export interface ValidateAccessResponse {
  ok: boolean;
  error?: string;
  session_token?: string;
  expires_at?: string;
  trabajador?: CheckSessionTrabajador;
  vehiculo?: CheckSessionVehiculo;
}

export interface SubmitInspectionResponse {
  ok: boolean;
  error?: string;
  inspection_id?: string;
  resultado?: string;
}
