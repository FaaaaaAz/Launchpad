-- ---------------------------------------------------------------------------
-- Alta de una cuenta nueva.
--
-- Al insertarse una fila en `auth.users` --da igual si fue por correo o por
-- Google-- esta migracion deja la cuenta lista para usarse: crea su perfil y
-- le siembra sus categorias.
--
-- Se hace con un trigger en la base y NO desde la app a proposito. Si lo
-- hiciera el cliente, una app que se cierra entre el registro y la primera
-- pantalla dejaria una cuenta a medias, y el registro con Google --que ocurre
-- fuera de la app, en el navegador-- no tendria ningun momento donde
-- ejecutarlo.
--
-- Ambas funciones son SECURITY DEFINER porque corren antes de que exista una
-- sesion: `auth.uid()` todavia es NULL y las policies del usuario aun no le
-- dejarian escribir nada. Llevan `set search_path = ''` para que ningun
-- esquema de usuario pueda interponer una funcion con el mismo nombre; por eso
-- todo va calificado con `public.` o `auth.`.
-- ---------------------------------------------------------------------------


/* -------------------------------------------------------------------------- */
/* Categorias por defecto                                                     */
/* -------------------------------------------------------------------------- */

-- Las mismas 18 que sembraba la migracion 001 de SQLite, con los mismos
-- nombres, colores e iconos. Los colores estan escritos a mano y no salen del
-- tema: una migracion es un registro historico y debe producir siempre el
-- mismo resultado, aunque manana cambie la paleta.
create or replace function public.seed_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Idempotente: si el usuario ya tiene sus categorias del sistema, no hace
  -- nada. Asi se puede volver a llamar sin duplicar (por ejemplo, para
  -- reparar una cuenta creada antes de esta migracion).
  if exists (
    select 1 from public.categories
    where user_id = p_user_id and is_system
  ) then
    return;
  end if;

  insert into public.categories (user_id, name, domain, color, icon, is_system)
  select p_user_id, seed.name, seed.domain, seed.color, seed.icon, true
  from (values
    -- Ejercicio
    ('Gimnasio',      'exercise'::text, '#FB7A45', 'barbell'),
    ('Boxeo',         'exercise',       '#F87171', 'hand-left'),
    ('Running',       'exercise',       '#34D399', 'walk'),
    ('Deporte',       'exercise',       '#60A5FA', 'football'),

    -- Academico
    ('Universidad',   'academic',       '#60A5FA', 'school'),
    ('Materia',       'academic',       '#8B78FF', 'book'),
    ('Proyecto',      'academic',       '#34D399', 'construct'),
    ('Curso',         'academic',       '#FBBF24', 'ribbon'),

    -- Hobbies
    ('Fotografía',    'hobby',          '#C084FC', 'camera'),
    ('Videojuegos',   'hobby',          '#60A5FA', 'game-controller'),
    ('Lectura',       'hobby',          '#FBBF24', 'book'),
    ('Música',        'hobby',          '#F87171', 'musical-notes'),
    ('Programación',  'hobby',          '#34D399', 'code-slash'),

    -- Tareas (domain NULL)
    ('Personal',      null,             '#8B78FF', 'person'),
    ('Estudio',       null,             '#60A5FA', 'school'),
    ('Salud',         null,             '#34D399', 'heart'),
    ('Finanzas',      null,             '#FBBF24', 'cash'),
    ('Casa',          null,             '#FB7A45', 'home')
  ) as seed(name, domain, color, icon);
end;
$$;

comment on function public.seed_default_categories(uuid) is
  'Siembra las categorias del sistema de un usuario. Idempotente.';


/* -------------------------------------------------------------------------- */
/* Trigger de alta                                                            */
/* -------------------------------------------------------------------------- */

-- De donde sale el nombre segun el metodo de acceso:
--
--   Correo   ->  `data` que envia signUp: display_name / first_name / last_name
--   Google   ->  el perfil de OpenID: name / given_name / family_name / picture
--
-- Se leen las dos formas y se usa la primera que exista. Si no hay ninguna,
-- el perfil queda con nombre vacio y la app lo pedira en "Mi cuenta": es
-- preferible a inventar un nombre a partir del correo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name   text;
  v_first     text;
  v_last      text;
  v_display   text;
begin
  full_name := nullif(trim(coalesce(meta ->> 'display_name', meta ->> 'full_name', meta ->> 'name', '')), '');

  v_first := nullif(trim(coalesce(meta ->> 'first_name', meta ->> 'given_name', '')), '');
  v_last  := nullif(trim(coalesce(meta ->> 'last_name',  meta ->> 'family_name', '')), '');

  -- Si el proveedor solo dio el nombre completo, se parte por el primer
  -- espacio. Es una heuristica y puede equivocarse con apellidos compuestos,
  -- pero el usuario puede corregirlo en "Mi cuenta" y `display_name` --que es
  -- lo unico que se muestra-- queda intacto de todos modos.
  if v_first is null and full_name is not null then
    v_first := split_part(full_name, ' ', 1);
    v_last  := nullif(trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1)), '');
  end if;

  v_display := coalesce(full_name, v_first);

  insert into public.profiles (id, first_name, last_name, display_name, avatar_url)
  values (
    new.id,
    v_first,
    v_last,
    v_display,
    nullif(trim(coalesce(meta ->> 'avatar_url', meta ->> 'picture', '')), '')
  )
  on conflict (id) do nothing;

  perform public.seed_default_categories(new.id);

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Crea el perfil y siembra las categorias al darse de alta una cuenta.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
