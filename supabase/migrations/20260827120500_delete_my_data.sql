-- ---------------------------------------------------------------------------
-- "Borrar todos los datos" de Configuracion.
--
-- Se resuelve con una funcion y no con nueve DELETE desde la app por dos
-- razones: es una sola transaccion --o se borra todo o no se borra nada, sin
-- dejar pagos huerfanos si se corta la red a mitad-- y es un solo viaje de
-- ida y vuelta.
--
-- Es SECURITY INVOKER (el modo por defecto, se deja explicito por claridad):
-- corre con los permisos de quien la llama, asi que RLS sigue aplicandose
-- dentro. El `where user_id = auth.uid()` es entonces redundante y esta a
-- proposito: si manana alguien aflojara una policy, este filtro seguiria
-- impidiendo que la funcion tocara datos ajenos.
--
-- Lo que NO borra:
--   * La cuenta. Cerrar sesion y borrar datos son cosas distintas.
--   * El perfil. Sin el, la app se quedaria sin nombre para saludar.
--   * Las categorias del sistema, igual que hacia la version local: son parte
--     del estado "recien instalado", no datos del usuario.
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'delete_my_data requiere una sesion activa';
  end if;

  -- Los ON DELETE CASCADE se encargarian de los hijos, pero se listan igual:
  -- una funcion que enumera lo que borra es una funcion que se puede revisar
  -- sin ir a mirar el esquema.
  delete from public.activity_events where user_id = uid;
  delete from public.payments        where user_id = uid;
  delete from public.finance_entries where user_id = uid;
  delete from public.routine_items   where user_id = uid;
  delete from public.routines        where user_id = uid;
  delete from public.reminders       where user_id = uid;
  delete from public.tasks           where user_id = uid;
  delete from public.activities      where user_id = uid;
  delete from public.categories      where user_id = uid and not is_system;
end;
$$;

comment on function public.delete_my_data() is
  'Borra los datos del usuario en sesion. Conserva cuenta, perfil y categorias del sistema.';

revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
