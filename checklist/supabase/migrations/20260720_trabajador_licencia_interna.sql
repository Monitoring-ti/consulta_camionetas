-- Licencia interna en trabajadores (admin solo edita estos campos + licencia conducir / psico)
alter table public.trabajadores
  add column if not exists numero_licencia_interna text,
  add column if not exists vencimiento_licencia_interna date;

comment on column public.trabajadores.numero_licencia_interna is
  'Número de licencia interna de la empresa';
comment on column public.trabajadores.vencimiento_licencia_interna is
  'Vencimiento de la licencia interna';
