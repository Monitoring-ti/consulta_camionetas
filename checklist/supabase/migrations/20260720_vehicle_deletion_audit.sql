-- Soft-delete audit for vehicles (historial → eliminar)
-- Run in Supabase SQL Editor if not applied yet.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text;

COMMENT ON COLUMN public.vehicles.deleted_at IS 'Marca eliminación definitiva desde historial; NULL = vigente';
COMMENT ON COLUMN public.vehicles.deleted_by IS 'Email del admin que eliminó el vehículo';

CREATE TABLE IF NOT EXISTS public.vehicle_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL,
  patente text NOT NULL,
  marca text,
  modelo text,
  anio integer,
  snapshot jsonb NOT NULL,
  deleted_by text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_deletion_log_deleted_at_idx
  ON public.vehicle_deletion_log (deleted_at DESC);

CREATE INDEX IF NOT EXISTS vehicles_deleted_at_idx
  ON public.vehicles (deleted_at)
  WHERE deleted_at IS NULL;

ALTER TABLE public.vehicle_deletion_log ENABLE ROW LEVEL SECURITY;

-- Solo service_role (sin políticas para anon/authenticated)
