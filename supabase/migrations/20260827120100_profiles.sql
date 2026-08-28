-- ---------------------------------------------------------------------------
-- Perfil del usuario.
--
-- `profiles.id` ES el UUID de `auth.users`: no se genera uno propio ni se
-- guarda el correo aquí. Supabase Auth ya administra correo, proveedor y
-- fechas de acceso; duplicarlos crearía dos fuentes de verdad que se
-- desincronizarían en cuanto el usuario cambiara su correo.
--
-- Esta tabla guarda SOLO lo que Auth no sabe: cómo quiere el usuario que le
-- llamemos y su avatar.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  first_name   text,
  last_name    text,
  -- Nombre con el que saluda PAD en el dashboard.
  display_name text,
  -- Clave relativa dentro del bucket de Storage, nunca una URL absoluta:
  -- misma decisión que `activities.image_key`.
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Datos de presentación del usuario. Comparte UUID con auth.users.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
