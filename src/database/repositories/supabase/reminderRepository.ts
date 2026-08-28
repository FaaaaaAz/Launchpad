import type { ReminderRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type {
  CreateInput,
  ID,
  Reminder,
  ReminderRepeat,
  ReminderStatus,
  ReminderTargetType,
  UpdateInput,
} from '@/types';
import { nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';

import type { ReminderRepository } from '../types';
import {
  asEnum,
  defined,
  toISO,
  unwrapMany,
  unwrapMaybe,
  unwrapOne,
  unwrapVoid,
} from './rows';

const TARGET_TYPES: readonly ReminderTargetType[] = [
  'task',
  'activity',
  'payment',
  'routine',
  'custom',
];
const REPEATS: readonly ReminderRepeat[] = ['none', 'daily', 'weekly'];
const STATUSES: readonly ReminderStatus[] = ['scheduled', 'delivered', 'cancelled'];

/** Cuántos recordatorios futuros se listan por defecto. */
const DEFAULT_UPCOMING_LIMIT = 20;

function toDomain(row: ReminderRow): Reminder {
  return {
    id: row.id,
    targetType: asEnum(row.target_type, TARGET_TYPES, 'custom'),
    targetId: row.target_id,
    title: row.title,
    body: row.body,
    scheduledAt: toISO(row.scheduled_at),
    repeat: asEnum(row.repeat_rule, REPEATS, 'none'),
    notificationId: row.notification_id,
    status: asEnum(row.status, STATUSES, 'scheduled'),
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

/**
 * Fila completa para el INSERT.
 *
 * `user_id` no aparece: lo pone el DEFAULT `auth.uid()` y lo verifica la
 * policy. Va aparte de `toPatch` porque insertar exige TODAS las columnas
 * obligatorias y actualizar solo las que cambian.
 */
function toInsert(input: CreateInput<Reminder>) {
  return {
    target_type: input.targetType,
    target_id: input.targetId,
    title: input.title,
    body: input.body,
    scheduled_at: input.scheduledAt,
    repeat_rule: input.repeat,
    notification_id: input.notificationId,
    status: input.status,
  };
}

/** Columnas que cambian. Las ausentes se quedan como estaban. */
function toPatch(input: UpdateInput<Reminder>) {
  return defined({
    target_type: input.targetType,
    target_id: input.targetId,
    title: input.title,
    body: input.body,
    scheduled_at: input.scheduledAt,
    repeat_rule: input.repeat,
    notification_id: input.notificationId,
    status: input.status,
  });
}

/**
 * Recordatorios en la nube.
 *
 * Aviso importante sobre `notificationId`: es el handle que devuelve el
 * sistema operativo al programar la notificacion, y solo significa algo en el
 * telefono que la programo. Sincronizar la fila no sincroniza la alarma.
 *
 * Consecuencia practica: al iniciar sesion en otro dispositivo los
 * recordatorios apareceran en la lista pero no sonaran hasta reprogramarlos.
 * Resolverlo bien pide notificaciones push (servidor), que estan fuera de esta
 * etapa; se documenta en vez de fingir que funciona.
 */
export const supabaseReminderRepository: ReminderRepository = {
  async list(): Promise<Reminder[]> {
    const rows = unwrapMany(
      await supabase.from('reminders').select('*').order('scheduled_at', { ascending: true }),
      'cargar los recordatorios',
    );
    return rows.map(toDomain);
  },

  /** Solo los futuros que siguen programados. */
  async listUpcoming(limit = DEFAULT_UPCOMING_LIMIT): Promise<Reminder[]> {
    const rows = unwrapMany(
      await supabase
        .from('reminders')
        .select('*')
        .eq('status', 'scheduled')
        .gte('scheduled_at', nowISO())
        .order('scheduled_at', { ascending: true })
        .limit(limit),
      'cargar los próximos avisos',
    );
    return rows.map(toDomain);
  },

  async listByTarget(targetType: ReminderTargetType, targetId: ID): Promise<Reminder[]> {
    const rows = unwrapMany(
      await supabase
        .from('reminders')
        .select('*')
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .order('scheduled_at', { ascending: true }),
      'cargar los recordatorios',
    );
    return rows.map(toDomain);
  },

  async findById(id: ID): Promise<Reminder | null> {
    const row = unwrapMaybe(
      await supabase.from('reminders').select('*').eq('id', id).maybeSingle(),
      'abrir el recordatorio',
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<Reminder>): Promise<Reminder> {
    const row = unwrapOne(
      await supabase.from('reminders').insert(toInsert(input)).select('*').single(),
      'crear el recordatorio',
    );
    return toDomain(row);
  },

  async update(id: ID, patch: UpdateInput<Reminder>): Promise<Reminder> {
    const row = unwrapMaybe(
      await supabase
        .from('reminders')
        .update(toPatch(patch))
        .eq('id', id)
        .select('*')
        .maybeSingle(),
      'guardar el recordatorio',
    );

    if (!row) throw new AppError('El recordatorio ya no existe.', 'reminder_not_found');
    return toDomain(row);
  },

  async remove(id: ID): Promise<void> {
    unwrapVoid(
      await supabase.from('reminders').delete().eq('id', id),
      'eliminar el recordatorio',
    );
  },
};
