-- ---------------------------------------------------------------------------
-- Esquema de datos de Launchpad en PostgreSQL.
--
-- Es el reflejo del esquema SQLite de `src/database/migrations/001..004`, con
-- cuatro diferencias deliberadas:
--
-- 1. `user_id` en toda tabla con datos privados. Es la columna sobre la que se
--    apoya Row Level Security; sin ella no hay forma de aislar cuentas.
--    Lleva `default auth.uid()` para que el cliente nunca tenga que enviarla
--    (y no pueda equivocarse al hacerlo: la policy la verifica igual).
--
-- 2. Tipos nativos donde el texto no aportaba nada: `date`, `boolean`,
--    `smallint[]`, `numeric`. Se mantiene `text` en las horas (HH:mm) porque
--    `time` devolveria HH:MM:SS y obligaria a recortar la cadena en cada
--    lectura.
--
-- 3. Los hijos (`payments`, `activity_events`, `routine_items`) tambien
--    llevan `user_id`. Es redundante --se podria llegar por el padre-- pero
--    convierte cada policy en una comparacion directa en lugar de un JOIN, y
--    una policy simple es una policy que se puede auditar de un vistazo.
--
-- 4. `updated_at` lo escribe un trigger, no el cliente.
--
-- Las claves foraneas no comprueban que el padre sea del mismo dueno: RLS ya
-- impide leer filas ajenas, y una fila que no puedes SELECT tampoco la puedes
-- descubrir para referenciarla.
-- ---------------------------------------------------------------------------


/* -------------------------------------------------------------------------- */
/* Categorias                                                                 */
/* -------------------------------------------------------------------------- */

-- Cada usuario tiene SU copia de las categorias del sistema. En SQLite eran
-- 18 filas sembradas por dispositivo con IDs fijos (cat-ex-gym); aqui los IDs
-- son UUID por usuario, porque un ID fijo compartido colisionaria entre
-- cuentas. La app nunca referencia una categoria por un ID escrito a mano.
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  -- NULL identifica a las categorias de tareas (no pertenecen a un modulo).
  domain     text check (domain in ('exercise', 'academic', 'hobby')),
  color      text not null,
  icon       text,
  -- Las sembradas al crear la cuenta. No se pueden borrar desde la app.
  is_system  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_user_domain
  on public.categories (user_id, domain);


/* -------------------------------------------------------------------------- */
/* Actividades                                                                */
/* -------------------------------------------------------------------------- */

-- Una sola entidad para Ejercicio, Academico y Hobbies, discriminada por
-- `domain`. Misma decision que en local: los tres modulos tienen exactamente
-- la misma forma.
create table if not exists public.activities (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  domain            text not null check (domain in ('exercise', 'academic', 'hobby')),
  name              text not null,
  subtitle          text,
  category_id       uuid references public.categories (id) on delete set null,
  -- Clave relativa (activity-images/<id>.jpg), no una URI absoluta: hoy
  -- resuelve al sistema de archivos del telefono y manana a un bucket de
  -- Supabase Storage sin migrar una sola fila.
  image_key         text,
  location          text,
  -- Texto libre a proposito: los deportes se validan al leer
  -- (parseSportKey), asi que agregar uno no obliga a otra migracion.
  sport_key         text,
  status            text not null default 'active'
                      check (status in ('active', 'paused', 'archived')),
  -- 0 = domingo ... 6 = sabado, igual que Date.prototype.getDay().
  weekdays          smallint[] not null default '{}'
                      check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  start_time        text,
  end_time          text,
  start_date        date,
  end_date          date,
  notes             text,
  billing_cycle     text not null default 'none'
                      check (billing_cycle in ('none', 'weekly', 'monthly', 'quarterly', 'yearly', 'oneTime')),
  billing_amount    numeric(12, 2),
  currency          text not null default 'BOB',
  last_payment_date date,
  -- El estado de pago NO se guarda: se deriva de esta fecha al pintar la card.
  -- Un payment_status almacenado quedaria obsoleto sin abrir la app.
  next_payment_date date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_activities_user_domain
  on public.activities (user_id, domain, status);
create index if not exists idx_activities_user_next_payment
  on public.activities (user_id, next_payment_date);


/* -------------------------------------------------------------------------- */
/* Calendario de actividades                                                  */
/* -------------------------------------------------------------------------- */

create table if not exists public.activity_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id  uuid not null references public.activities (id) on delete cascade,
  date         date not null,
  kind         text not null default 'training' check (kind in ('training', 'match')),
  title        text,
  notes        text,
  completed    boolean not null default false,
  -- Distingue lo que rellena la app de lo que anota el usuario: al cambiar el
  -- horario se rehacen solo los generados y los partidos sobreviven.
  is_generated boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_activity_events_activity
  on public.activity_events (activity_id, date);
create index if not exists idx_activity_events_user_date
  on public.activity_events (user_id, date);


/* -------------------------------------------------------------------------- */
/* Pagos                                                                      */
/* -------------------------------------------------------------------------- */

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id  uuid not null references public.activities (id) on delete cascade,
  amount       numeric(12, 2) not null,
  currency     text not null,
  paid_at      date not null,
  covers_until date,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_payments_activity
  on public.payments (activity_id, paid_at desc);


/* -------------------------------------------------------------------------- */
/* Tareas                                                                     */
/* -------------------------------------------------------------------------- */

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'pending' check (status in ('pending', 'completed')),
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date     date,
  due_time     text,
  category_id  uuid references public.categories (id) on delete set null,
  -- Vincula la tarea a una actividad: "Renovar membresia" -> Gimnasio.
  activity_id  uuid references public.activities (id) on delete set null,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_tasks_user_status
  on public.tasks (user_id, status, due_date);


/* -------------------------------------------------------------------------- */
/* Recordatorios                                                              */
/* -------------------------------------------------------------------------- */

-- Polimorfico a proposito (`target_type` + `target_id`): un recordatorio puede
-- colgar de una tarea, un pago o manana de un habito sin cambiar el esquema.
-- Por eso `target_id` NO es una clave foranea.
--
-- `notification_id` es el handle que devuelve el sistema operativo del
-- telefono. Es local a un dispositivo: se sincroniza el recordatorio, no la
-- notificacion programada. Al entrar en otro telefono habra que reprogramar.
create table if not exists public.reminders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_type     text not null
                    check (target_type in ('task', 'activity', 'payment', 'routine', 'custom')),
  target_id       uuid,
  title           text not null,
  body            text,
  scheduled_at    timestamptz not null,
  repeat_rule     text not null default 'none' check (repeat_rule in ('none', 'daily', 'weekly')),
  notification_id text,
  status          text not null default 'scheduled'
                    check (status in ('scheduled', 'delivered', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_reminders_target
  on public.reminders (user_id, target_type, target_id);
create index if not exists idx_reminders_pending
  on public.reminders (user_id, status, scheduled_at);


/* -------------------------------------------------------------------------- */
/* Alcancia                                                                   */
/* -------------------------------------------------------------------------- */

create table if not exists public.finance_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind               text not null check (kind in ('income', 'expense', 'debt', 'saving')),
  name               text not null,
  amount             numeric(12, 2) not null default 0,
  currency           text not null default 'BOB',
  -- Solo deudas y ahorros: total a pagar o meta a alcanzar.
  target_amount      numeric(12, 2),
  settled_amount     numeric(12, 2),
  due_day            smallint check (due_day between 1 and 31),
  -- YYYY-MM. Guardar el mes y no un booleano hace que el control mensual se
  -- reinicie solo al cambiar de mes, sin tarea programada que limpie banderas.
  last_settled_month text check (last_settled_month ~ '^[0-9]{4}-[0-9]{2}$'),
  notes              text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_finance_user_kind
  on public.finance_entries (user_id, kind, is_active);


/* -------------------------------------------------------------------------- */
/* Rutinas (esquema listo, UI pendiente)                                      */
/* -------------------------------------------------------------------------- */

create table if not exists public.routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  domain     text check (domain in ('exercise', 'academic', 'hobby')),
  weekdays   smallint[] not null default '{}'
               check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id       uuid not null references public.routines (id) on delete cascade,
  title            text not null,
  time             text,
  duration_minutes integer check (duration_minutes >= 0),
  position         integer not null default 0,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_routine_items_routine
  on public.routine_items (routine_id, position);


/* -------------------------------------------------------------------------- */
/* updated_at automatico en todas                                             */
/* -------------------------------------------------------------------------- */

do $$
declare
  target text;
begin
  foreach target in array array[
    'categories', 'activities', 'activity_events', 'payments',
    'tasks', 'reminders', 'finance_entries', 'routines', 'routine_items'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', target || '_set_updated_at', target);
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      target || '_set_updated_at', target
    );
  end loop;
end;
$$;
