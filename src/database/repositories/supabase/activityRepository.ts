import type { ActivityRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type {
  Activity,
  ActivityDomain,
  ActivityStatus,
  BillingCycle,
  CreateInput,
  ID,
  UpdateInput,
} from '@/types';
import { AppError } from '@/utils/errors';

import type { ActivityFilter, ActivityRepository } from '../types';
import {
  asEnum,
  defined,
  fromWeekdays,
  toISO,
  toNumberOrNull,
  toWeekdays,
  unwrapMany,
  unwrapMaybe,
  unwrapOne,
  unwrapVoid,
} from './rows';

const DOMAINS: readonly ActivityDomain[] = ['exercise', 'academic', 'hobby'];
const STATUSES: readonly ActivityStatus[] = ['active', 'paused', 'archived'];
const BILLING_CYCLES: readonly BillingCycle[] = [
  'none',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'oneTime',
];

/** Activas primero: es el orden en que se quieren ver, no el alfabetico. */
const STATUS_WEIGHT: Record<ActivityStatus, number> = { active: 0, paused: 1, archived: 2 };

function toDomain(row: ActivityRow): Activity {
  return {
    id: row.id,
    domain: asEnum(row.domain, DOMAINS, 'hobby'),
    name: row.name,
    subtitle: row.subtitle,
    categoryId: row.category_id,
    imageKey: row.image_key,
    location: row.location,
    sportKey: row.sport_key,
    status: asEnum(row.status, STATUSES, 'active'),
    weekdays: toWeekdays(row.weekdays),
    startTime: row.start_time,
    endTime: row.end_time,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    billingCycle: asEnum(row.billing_cycle, BILLING_CYCLES, 'none'),
    billingAmount: toNumberOrNull(row.billing_amount),
    currency: row.currency,
    lastPaymentDate: row.last_payment_date,
    nextPaymentDate: row.next_payment_date,
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

/**
 * Fila completa para el INSERT.
 *
 * `user_id` no aparece: lo pone el DEFAULT `auth.uid()` y lo verifica la
 * policy. Va aparte de `toPatch` porque insertar exige TODAS las columnas
 * obligatorias y actualizar solo las que cambian; una función para los dos
 * casos tendría que aceptar campos ausentes y perdería esa comprobación.
 */
function toInsert(input: CreateInput<Activity>) {
  return {
    domain: input.domain,
    name: input.name,
    subtitle: input.subtitle,
    category_id: input.categoryId,
    image_key: input.imageKey,
    location: input.location,
    sport_key: input.sportKey,
    status: input.status,
    // `smallint[]` acepta el array tal cual; no hace falta serializar a JSON
    // como en SQLite, que solo tiene columnas de texto.
    weekdays: fromWeekdays(input.weekdays),
    start_time: input.startTime,
    end_time: input.endTime,
    start_date: input.startDate,
    end_date: input.endDate,
    notes: input.notes,
    billing_cycle: input.billingCycle,
    billing_amount: input.billingAmount,
    currency: input.currency,
    last_payment_date: input.lastPaymentDate,
    next_payment_date: input.nextPaymentDate,
  };
}

/** Columnas que cambian. Las ausentes se quedan como estaban. */
function toPatch(input: UpdateInput<Activity>) {
  return defined({
    domain: input.domain,
    name: input.name,
    subtitle: input.subtitle,
    category_id: input.categoryId,
    image_key: input.imageKey,
    location: input.location,
    sport_key: input.sportKey,
    status: input.status,
    // `smallint[]` acepta el array tal cual; no hace falta serializar a JSON
    // como en SQLite, que solo tiene columnas de texto.
    weekdays: input.weekdays === undefined ? undefined : fromWeekdays(input.weekdays),
    start_time: input.startTime,
    end_time: input.endTime,
    start_date: input.startDate,
    end_date: input.endDate,
    notes: input.notes,
    billing_cycle: input.billingCycle,
    billing_amount: input.billingAmount,
    currency: input.currency,
    last_payment_date: input.lastPaymentDate,
    next_payment_date: input.nextPaymentDate,
  });
}

/** Activas, pausadas, archivadas; dentro de cada grupo por nombre. */
function byReadingOrder(a: Activity, b: Activity): number {
  const byStatus = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
  if (byStatus !== 0) return byStatus;

  // Se comparan en minusculas en lugar de con `localeCompare`: el soporte de
  // Intl en Hermes varia segun plataforma, y un orden que cambia de un
  // telefono a otro es peor que uno simple y predecible. Equivale al
  // COLLATE NOCASE que usaba SQLite.
  const left = a.name.toLowerCase();
  const right = b.name.toLowerCase();
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export const supabaseActivityRepository: ActivityRepository = {
  async list(filter: ActivityFilter = {}): Promise<Activity[]> {
    let query = supabase.from('activities').select('*');

    if (filter.domain) query = query.eq('domain', filter.domain);
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.excludeArchived) query = query.neq('status', 'archived');

    const rows = unwrapMany(await query, 'cargar las actividades');
    return rows.map(toDomain).sort(byReadingOrder);
  },

  async findById(id: ID): Promise<Activity | null> {
    const row = unwrapMaybe(
      await supabase.from('activities').select('*').eq('id', id).maybeSingle(),
      'abrir la actividad',
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<Activity>): Promise<Activity> {
    const row = unwrapOne(
      await supabase.from('activities').insert(toInsert(input)).select('*').single(),
      'crear la actividad',
    );
    return toDomain(row);
  },

  async update(id: ID, patch: UpdateInput<Activity>): Promise<Activity> {
    const row = unwrapMaybe(
      await supabase
        .from('activities')
        .update(toPatch(patch))
        .eq('id', id)
        .select('*')
        .maybeSingle(),
      'guardar la actividad',
    );

    if (!row) throw new AppError('La actividad ya no existe.', 'activity_not_found');
    return toDomain(row);
  },

  async remove(id: ID): Promise<void> {
    // Los pagos y los dias del calendario caen con ella por ON DELETE CASCADE,
    // igual que en SQLite. Las tareas vinculadas sobreviven con `activity_id`
    // a NULL (ON DELETE SET NULL): borrar el gimnasio no debe borrar de paso
    // la tarea de renovar la membresia.
    unwrapVoid(
      await supabase.from('activities').delete().eq('id', id),
      'eliminar la actividad',
    );
  },
};
