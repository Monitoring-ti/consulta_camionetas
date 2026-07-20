-- =============================================================================
-- Monitoring Check Campo — Seguridad Supabase
-- Ejecutar en SQL Editor (proyecto compartido Monitoring)
--
-- Principio: el cliente anon NO lee tablas directamente.
-- Solo ejecuta RPCs controladas (SECURITY DEFINER).
-- =============================================================================

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.normalize_rut(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(regexp_replace(trim(coalesce(p, '')), '[^0-9kK]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.normalize_patente(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(regexp_replace(trim(coalesce(p, '')), '[^A-Za-z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.is_valid_patente_cl(p text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    public.normalize_patente(p) ~ '^([A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2})$',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.trabajador_nombre_completo(t public.trabajadores)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(concat_ws(' ',
    nullif(trim(t.nombre_1), ''),
    nullif(trim(t.nombre_2), ''),
    nullif(trim(t.apellido_paterno), ''),
    nullif(trim(t.apellido_materno), '')
  ));
$$;

-- ─── Sesiones de campo (token de un solo uso / expira) ────────────────────────

CREATE TABLE IF NOT EXISTS public.check_field_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at    timestamptz NOT NULL,
  rut           text NOT NULL,
  patente       text NOT NULL,
  trabajador_id uuid NOT NULL REFERENCES public.trabajadores(id_trabajador),
  vehicle_id    uuid NOT NULL REFERENCES public.vehicles(id),
  used_at       timestamptz,
  CONSTRAINT check_field_sessions_expires_chk CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_check_field_sessions_expires
  ON public.check_field_sessions(expires_at);

ALTER TABLE public.check_field_sessions ENABLE ROW LEVEL SECURITY;

-- Sin políticas para anon/authenticated → solo RPC (SECURITY DEFINER) accede.

-- ─── RPC: Validar RUT + patente ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_validate_access(
  p_rut text,
  p_patente text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rut text := public.normalize_rut(p_rut);
  v_patente text := public.normalize_patente(p_patente);
  v_trab public.trabajadores%ROWTYPE;
  v_veh public.vehicles%ROWTYPE;
  v_session_id uuid;
  v_expires timestamptz := timezone('utc', now()) + interval '4 hours';
BEGIN
  IF v_rut = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RUT inválido');
  END IF;

  IF NOT public.is_valid_patente_cl(p_patente) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Patente chilena inválida');
  END IF;

  SELECT *
  INTO v_trab
  FROM public.trabajadores t
  WHERE upper(coalesce(t.tipo_identificacion, '')) = 'RUT'
    AND public.normalize_rut(t.numero_identificacion) = v_rut
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RUT no registrado en trabajadores');
  END IF;

  SELECT *
  INTO v_veh
  FROM public.vehicles v
  WHERE public.normalize_patente(v.patente) = v_patente
    AND coalesce(v.is_active, true) = true
    AND v.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Patente no encontrada o vehículo inactivo');
  END IF;

  INSERT INTO public.check_field_sessions (expires_at, rut, patente, trabajador_id, vehicle_id)
  VALUES (v_expires, v_rut, v_patente, v_trab.id_trabajador, v_veh.id)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'session_token', v_session_id,
    'expires_at', v_expires,
    'trabajador', jsonb_build_object(
      'id', v_trab.id_trabajador,
      'nombre', public.trabajador_nombre_completo(v_trab),
      'cargo', coalesce(v_trab.cargo, ''),
      'rut', v_rut
    ),
    'vehiculo', jsonb_build_object(
      'id', v_veh.id,
      'patente', v_veh.patente,
      'marca', v_veh.marca,
      'modelo', v_veh.modelo,
      'anio', v_veh.anio,
      'km_actual', coalesce(v_veh.km_actual, 0)
    )
  );
END;
$$;

-- ─── RPC: Enviar inspección ─────────────────────────────────────────────────

-- Identidad del inspector (RUT / trabajador) — idempotente
ALTER TABLE public.monitoring_inspections
  ADD COLUMN IF NOT EXISTS responsable_rut text,
  ADD COLUMN IF NOT EXISTS trabajador_id uuid REFERENCES public.trabajadores(id_trabajador);

CREATE OR REPLACE FUNCTION public.check_submit_inspection(
  p_session_token uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sess public.check_field_sessions%ROWTYPE;
  v_insp_id uuid;
  v_km integer;
  v_last_km integer;
  v_resultado text;
  v_detail jsonb;
BEGIN
  SELECT * INTO v_sess
  FROM public.check_field_sessions
  WHERE id = p_session_token
    AND used_at IS NULL
    AND expires_at > timezone('utc', now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sesión inválida o expirada. Vuelva a ingresar RUT y patente.');
  END IF;

  v_km := (p_payload->>'kilometraje')::integer;
  SELECT km_actual INTO v_last_km FROM public.vehicles WHERE id = v_sess.vehicle_id;

  IF v_km IS NULL OR v_km <= coalesce(v_last_km, 0) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Kilometraje debe ser mayor a %s', coalesce(v_last_km, 0))
    );
  END IF;

  v_resultado := coalesce(p_payload->>'resultado', 'Vehículo Apto');

  INSERT INTO public.monitoring_inspections (
    fecha, hora, responsable_inspeccion, cargo, patente,
    kilometraje, marca_modelo, anio, observaciones, resultado,
    firma_url, foto_frontal, foto_trasera, foto_lateral_der, foto_lateral_izq,
    nivel_combustible, responsable_rut, trabajador_id
  ) VALUES (
    (p_payload->>'fecha')::date,
    (p_payload->>'hora')::time,
    p_payload->>'responsable_inspeccion',
    p_payload->>'cargo',
    p_payload->>'patente',
    v_km,
    p_payload->>'marca_modelo',
    (p_payload->>'anio')::integer,
    nullif(p_payload->>'observaciones', ''),
    v_resultado,
    nullif(p_payload->>'firma_url', ''),
    nullif(p_payload->>'foto_frontal', ''),
    nullif(p_payload->>'foto_trasera', ''),
    nullif(p_payload->>'foto_lateral_der', ''),
    nullif(p_payload->>'foto_lateral_izq', ''),
    nullif(p_payload->>'nivel_combustible', ''),
    coalesce(nullif(p_payload->>'responsable_rut', ''), v_sess.rut),
    coalesce(
      nullif(p_payload->>'trabajador_id', '')::uuid,
      v_sess.trabajador_id
    )
  )
  RETURNING id INTO v_insp_id;

  FOR v_detail IN SELECT * FROM jsonb_array_elements(coalesce(p_payload->'details', '[]'::jsonb))
  LOOP
    INSERT INTO public.monitoring_inspection_details (
      inspection_id, seccion, item_key, item_label,
      is_good, descripcion, foto_url, geotag, is_blocking
    ) VALUES (
      v_insp_id,
      v_detail->>'seccion',
      v_detail->>'item_key',
      v_detail->>'item_label',
      (v_detail->>'is_good')::boolean,
      nullif(v_detail->>'descripcion', ''),
      nullif(v_detail->>'foto_url', ''),
      nullif(v_detail->>'geotag', ''),
      coalesce((v_detail->>'is_blocking')::boolean, false)
    );
  END LOOP;

  UPDATE public.vehicles
  SET km_actual = v_km,
      last_inspection_at = timezone('utc', now())
  WHERE id = v_sess.vehicle_id;

  UPDATE public.check_field_sessions
  SET used_at = timezone('utc', now())
  WHERE id = p_session_token;

  RETURN jsonb_build_object(
    'ok', true,
    'inspection_id', v_insp_id,
    'resultado', v_resultado
  );
END;
$$;

-- ─── Permisos RPC (solo estas funciones para anon) ────────────────────────────

REVOKE ALL ON FUNCTION public.check_validate_access(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_submit_inspection(uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_validate_access(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_submit_inspection(uuid, jsonb) TO anon, authenticated;

-- ─── RLS: bloquear lectura/escritura directa desde anon ───────────────────────

ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_inspection_details ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas permisivas previas si existían (desarrollo)
DROP POLICY IF EXISTS "Allow all for anon" ON public.vehicles;
DROP POLICY IF EXISTS "Allow all for anon" ON public.inspectors;
DROP POLICY IF EXISTS "Allow all for anon" ON public.monitoring_inspections;
DROP POLICY IF EXISTS "Allow all for anon" ON public.monitoring_inspection_details;

-- Sin políticas = anon no accede (service_role y SECURITY DEFINER sí)

-- ─── Storage: bucket vehicle-photos ─────────────────────────────────────────
-- Crear bucket manualmente en UI si no existe (público para lectura de URLs).

DROP POLICY IF EXISTS "check_campo_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "check_campo_storage_select" ON storage.objects;

CREATE POLICY "check_campo_storage_insert"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos'
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
);

CREATE POLICY "check_campo_storage_select"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'vehicle-photos');

-- ─── Limpieza de sesiones expiradas (opcional, cron diario) ─────────────────

CREATE OR REPLACE FUNCTION public.check_cleanup_expired_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.check_field_sessions
  WHERE expires_at < timezone('utc', now()) - interval '7 days';
$$;
