-- Persist inspector identity on monitoring_inspections
-- Run in Supabase SQL Editor after deploying checklist RPC changes.

ALTER TABLE public.monitoring_inspections
  ADD COLUMN IF NOT EXISTS responsable_rut text,
  ADD COLUMN IF NOT EXISTS trabajador_id uuid REFERENCES public.trabajadores(id_trabajador);

CREATE INDEX IF NOT EXISTS idx_monitoring_inspections_trabajador
  ON public.monitoring_inspections(trabajador_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_inspections_responsable_rut
  ON public.monitoring_inspections(responsable_rut);
