import { resolveVehiclePhotoUrl } from '@/lib/utils/storage-url'

/**
 * Normaliza URL de foto de hallazgo/apoyo para el admin.
 * Acepta URL pública completa o path relativo dentro del bucket.
 */
export function resolveInspectionPhotoUrl(url: string | null | undefined): string | null {
  return resolveVehiclePhotoUrl(url)
}
