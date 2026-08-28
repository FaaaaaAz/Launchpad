-- ---------------------------------------------------------------------------
-- Row Level Security.
--
-- Esta es la unica cosa que separa los datos de un usuario de los de otro.
-- La app movil lleva la clave publicable dentro del binario, asi que cualquiera
-- puede extraerla y hablar con la API directamente: la seguridad NO puede
-- estar en el cliente. Aqui es donde esta.
--
-- Reglas que se siguen en todo el archivo:
--
-- * Una policy por operacion (SELECT / INSERT / UPDATE / DELETE). Una sola
--   policy FOR ALL parece mas corta, pero cuando manana haya que abrir una
--   excepcion --por ejemplo, compartir una rutina en solo lectura-- hay que
--   deshacerla entera. Separadas, se toca solo la que cambia.
--
-- * `to authenticated`. Sin esa clausula la policy tambien se evalua para el
--   rol `anon`, donde `auth.uid()` es NULL: la comparacion daria falso y
--   funcionaria igual, pero por accidente. Se declara explicitamente.
--
-- * UPDATE lleva USING y WITH CHECK. USING decide que filas puedes tocar;
--   WITH CHECK decide como pueden quedar. Sin WITH CHECK, un usuario podria
--   reasignar `user_id` a otra cuenta y regalarle --o esconderle-- una fila.
--
-- * Nunca `using (true)` sobre datos privados.
--
-- `auth.uid()` va envuelto en `(select auth.uid())`: asi Postgres lo evalua
-- una vez por consulta en lugar de una vez por fila, que es la diferencia
-- entre una lista instantanea y una que se arrastra al crecer.
-- ---------------------------------------------------------------------------


/* -------------------------------------------------------------------------- */
/* Activar RLS en todas las tablas                                            */
/* -------------------------------------------------------------------------- */

alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.activities      enable row level security;
alter table public.activity_events enable row level security;
alter table public.payments        enable row level security;
alter table public.tasks           enable row level security;
alter table public.reminders       enable row level security;
alter table public.finance_entries enable row level security;
alter table public.routines        enable row level security;
alter table public.routine_items   enable row level security;


/* -------------------------------------------------------------------------- */
/* Perfil                                                                     */
/* -------------------------------------------------------------------------- */

-- El perfil se identifica por `id` (que ES el UUID de auth.users), no por una
-- columna `user_id` aparte.
--
-- No hay policy de DELETE a proposito: el perfil vive y muere con la cuenta.
-- Si el usuario borrara su fila mientras su usuario de Auth sigue existiendo,
-- se quedaria dentro de la app sin nombre ni avatar y sin forma de
-- recrearlos, porque el trigger de alta solo corre una vez. Al eliminar la
-- cuenta, el ON DELETE CASCADE se encarga.
-- Los DROP van delante para que este archivo se pueda volver a ejecutar sin
-- error. Importa de verdad: lo normal es pegarlo en el SQL Editor, y ahi es
-- muy facil ejecutarlo dos veces.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);


/* -------------------------------------------------------------------------- */
/* Tablas de datos                                                            */
/* -------------------------------------------------------------------------- */

-- Las nueve tablas restantes comparten exactamente la misma regla: eres dueno
-- de la fila si tu UUID esta en `user_id`. Escribir las 36 policies a mano
-- seria 36 oportunidades de teclear mal una comparacion; el bucle garantiza
-- que sean identicas. Se pueden leer todas con:
--
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies where schemaname = 'public';
do $$
declare
  target text;
begin
  foreach target in array array[
    'categories', 'activities', 'activity_events', 'payments',
    'tasks', 'reminders', 'finance_entries', 'routines', 'routine_items'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', target || '_select_own', target);
    execute format('drop policy if exists %I on public.%I', target || '_insert_own', target);
    execute format('drop policy if exists %I on public.%I', target || '_update_own', target);
    execute format('drop policy if exists %I on public.%I', target || '_delete_own', target);

    execute format(
      'create policy %I on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)',
      target || '_select_own', target
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)',
      target || '_insert_own', target
    );

    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)',
      target || '_update_own', target
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)',
      target || '_delete_own', target
    );
  end loop;
end;
$$;


/* -------------------------------------------------------------------------- */
/* Grants                                                                     */
/* -------------------------------------------------------------------------- */

-- RLS filtra filas, pero solo se aplica a roles que ya tienen permiso sobre la
-- tabla. Los dos mecanismos son independientes y hacen falta los dos.
--
-- `anon` es el rol de quien llega sin sesion. Ninguna tabla de Launchpad tiene
-- datos publicos, asi que se le retira todo: aunque manana alguien creara una
-- policy demasiado abierta por error, `anon` seguiria sin poder leer nada.
grant usage on schema public to authenticated;

revoke all on public.profiles        from anon;
revoke all on public.categories      from anon;
revoke all on public.activities      from anon;
revoke all on public.activity_events from anon;
revoke all on public.payments        from anon;
revoke all on public.tasks           from anon;
revoke all on public.reminders       from anon;
revoke all on public.finance_entries from anon;
revoke all on public.routines        from anon;
revoke all on public.routine_items   from anon;

grant select, insert, update         on public.profiles        to authenticated;
grant select, insert, update, delete on public.categories      to authenticated;
grant select, insert, update, delete on public.activities      to authenticated;
grant select, insert, update, delete on public.activity_events to authenticated;
grant select, insert, update, delete on public.payments        to authenticated;
grant select, insert, update, delete on public.tasks           to authenticated;
grant select, insert, update, delete on public.reminders       to authenticated;
grant select, insert, update, delete on public.finance_entries to authenticated;
grant select, insert, update, delete on public.routines        to authenticated;
grant select, insert, update, delete on public.routine_items   to authenticated;

-- Y que las tablas futuras nazcan igual de cerradas, sin depender de que
-- alguien se acuerde de escribir el REVOKE.
alter default privileges in schema public revoke all on tables from anon;
