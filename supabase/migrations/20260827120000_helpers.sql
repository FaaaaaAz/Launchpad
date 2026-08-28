-- ---------------------------------------------------------------------------
-- Utilidades compartidas por el resto de migraciones.
--
-- Una migración es un registro histórico: nunca se edita una ya aplicada, se
-- agrega la siguiente. Es la misma regla que sigue `src/database/migrations/`
-- para SQLite.
-- ---------------------------------------------------------------------------

-- `updated_at` no se confía al cliente: lo escribe la base en cada UPDATE.
-- Si dependiera de la app, dos dispositivos con la hora desajustada
-- producirían un historial incoherente.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: mantiene updated_at al día sin confiar en el cliente.';
