/**
 * Forma de la base de datos, tal y como la ve PostgREST.
 *
 * Es lo que hace que `supabase.from('tasks').select()` devuelva algo tipado en
 * vez de `any`, y que un nombre de columna mal escrito sea un error de
 * compilación y no una fila vacía en el teléfono.
 *
 * Está escrito a mano y no generado porque generar exige un proyecto ya creado
 * y la CLI enlazada, y el proyecto tiene que compilar antes de eso. Cuando
 * tengas la CLI configurada se puede regenerar y sustituir este archivo:
 *
 *   npx supabase gen types typescript --linked > src/lib/database.types.ts
 *
 * IMPORTANTE al editarlo a mano: este archivo DESCRIBE el esquema, no lo
 * define. La fuente de verdad son las migraciones de `supabase/migrations/`.
 * Cambiar aquí una columna no cambia nada en la base; solo hace que TypeScript
 * mienta.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ TODO SON `type` Y NO `interface`
 *
 * PostgREST exige que cada fila encaje en `Record<string, unknown>`, y en
 * TypeScript un `interface` NO es asignable a un tipo con índice: solo los
 * alias de tipo reciben índice implícito. Con `interface`, el esquema entero
 * deja de reconocerse y todas las consultas se resuelven a `never`, con
 * errores que hablan de `never[]` y no dicen nada de la causa.
 *
 * Es la razón por la que el generador de Supabase emite `type`. Aquí también.
 * ---------------------------------------------------------------------------
 */

/* -------------------------------------------------------------------------- */
/* Ayudantes                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Describe una tabla a partir de su fila.
 *
 * `Needed` enumera las columnas que hay que enviar al insertar. Todo lo demás
 * es opcional porque la base lo rellena: `id` con `gen_random_uuid()`,
 * `user_id` con `auth.uid()`, las fechas con `now()` y los estados con su
 * DEFAULT.
 */
type Table<Row, Needed extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Needed>;
  Update: Partial<Row>;
  Relationships: [];
};

/** Columnas de auditoría. Las escribe la base; el cliente nunca las manda. */
type Audited = {
  created_at: string;
  updated_at: string;
};

/** Toda fila privada pertenece a un usuario: es la columna que filtra RLS. */
type Owned = Audited & {
  id: string;
  user_id: string;
};

/* -------------------------------------------------------------------------- */
/* Filas                                                                      */
/* -------------------------------------------------------------------------- */

export type ProfileRow = Audited & {
  /** El MISMO UUID que `auth.users.id`. No se genera uno propio. */
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type CategoryRow = Owned & {
  name: string;
  /** NULL = categoría de tareas (no pertenece a ningún módulo). */
  domain: string | null;
  color: string;
  icon: string | null;
  is_system: boolean;
};

export type ActivityRow = Owned & {
  domain: string;
  name: string;
  subtitle: string | null;
  category_id: string | null;
  image_key: string | null;
  location: string | null;
  sport_key: string | null;
  status: string;
  /** `smallint[]` en Postgres: llega y se envía como array de números. */
  weekdays: number[];
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  billing_cycle: string;
  billing_amount: number | null;
  currency: string;
  last_payment_date: string | null;
  next_payment_date: string | null;
};

export type ActivityEventRow = Owned & {
  activity_id: string;
  date: string;
  kind: string;
  title: string | null;
  notes: string | null;
  completed: boolean;
  is_generated: boolean;
};

export type PaymentRow = Owned & {
  activity_id: string;
  amount: number;
  currency: string;
  paid_at: string;
  covers_until: string | null;
  notes: string | null;
};

export type TaskRow = Owned & {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  category_id: string | null;
  activity_id: string | null;
  completed_at: string | null;
};

export type ReminderRow = Owned & {
  target_type: string;
  /** Polimórfico: apunta a una tarea, un pago o una rutina. Sin clave foránea. */
  target_id: string | null;
  title: string;
  body: string | null;
  scheduled_at: string;
  repeat_rule: string;
  notification_id: string | null;
  status: string;
};

export type FinanceEntryRow = Owned & {
  kind: string;
  name: string;
  amount: number;
  currency: string;
  target_amount: number | null;
  settled_amount: number | null;
  due_day: number | null;
  last_settled_month: string | null;
  notes: string | null;
  is_active: boolean;
};

export type RoutineRow = Owned & {
  name: string;
  domain: string | null;
  weekdays: number[];
  is_active: boolean;
};

export type RoutineItemRow = Owned & {
  routine_id: string;
  title: string;
  time: string | null;
  duration_minutes: number | null;
  position: number;
  notes: string | null;
};

/* -------------------------------------------------------------------------- */
/* Esquema                                                                    */
/* -------------------------------------------------------------------------- */

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id'>;
      categories: Table<CategoryRow, 'name' | 'color'>;
      activities: Table<ActivityRow, 'domain' | 'name'>;
      activity_events: Table<ActivityEventRow, 'activity_id' | 'date'>;
      payments: Table<PaymentRow, 'activity_id' | 'amount' | 'currency' | 'paid_at'>;
      tasks: Table<TaskRow, 'title'>;
      reminders: Table<ReminderRow, 'target_type' | 'title' | 'scheduled_at'>;
      finance_entries: Table<FinanceEntryRow, 'kind' | 'name'>;
      routines: Table<RoutineRow, 'name'>;
      routine_items: Table<RoutineItemRow, 'routine_id' | 'title'>;
    };
    Views: { [_ in never]: never };
    Functions: {
      /** Borra los datos del usuario en sesión. Conserva cuenta y perfil. */
      delete_my_data: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
