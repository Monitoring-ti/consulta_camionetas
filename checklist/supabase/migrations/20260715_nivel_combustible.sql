-- Nivel de combustible opcional en inspecciones de campo
ALTER TABLE public.monitoring_inspections
  ADD COLUMN IF NOT EXISTS nivel_combustible text;

ALTER TABLE public.monitoring_inspections
  DROP CONSTRAINT IF EXISTS monitoring_inspections_nivel_combustible_check;

ALTER TABLE public.monitoring_inspections
  ADD CONSTRAINT monitoring_inspections_nivel_combustible_check
  CHECK (
    nivel_combustible IS NULL
    OR nivel_combustible IN ('1/8', '1/4', '1/2', '3/4', 'FULL')
  );

COMMENT ON COLUMN public.monitoring_inspections.nivel_combustible IS
  'Marcador de combustible opcional: 1/8, 1/4, 1/2, 3/4, FULL';
