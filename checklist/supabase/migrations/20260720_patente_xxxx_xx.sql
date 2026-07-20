-- Formato único de patente de flota: XXXX-XX (4 letras + 2 números)
CREATE OR REPLACE FUNCTION public.is_valid_patente_cl(p text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    public.normalize_patente(p) ~ '^[A-Z]{4}[0-9]{2}$',
    false
  );
$$;
