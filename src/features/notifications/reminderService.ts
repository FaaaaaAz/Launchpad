import { repositories } from '@/database';
import * as notifications from '@/services/notifications';
import type { ID, Reminder, ReminderTargetType } from '@/types';
import { nowISO } from '@/utils/date';

/**
 * Une los recordatorios guardados en la base con las notificaciones del
 * sistema operativo.
 *
 * Regla: la fila en `reminders` es la fuente de verdad de la intención del
 * usuario; `notificationId` es solo el handle que devuelve iOS/Android para
 * poder cancelarla. Si se pierde el permiso, la intención sigue registrada.
 */

export interface ScheduleReminderInput {
  targetType: ReminderTargetType;
  targetId: ID | null;
  title: string;
  body?: string | null;
  /** Momento exacto en que debe sonar. */
  when: Date;
}

/**
 * Resultado explícito para que la UI pueda explicar qué ocurrió en vez de
 * fallar en silencio, que es el peor comportamiento posible en recordatorios.
 */
export type ReminderOutcome =
  | { status: 'scheduled'; reminder: Reminder }
  | { status: 'permission-denied' }
  | { status: 'in-past' };

export async function scheduleReminder(
  input: ScheduleReminderInput,
): Promise<ReminderOutcome> {
  if (input.when.getTime() <= Date.now()) {
    return { status: 'in-past' };
  }

  const permission = await notifications.ensurePermission();
  if (permission !== 'granted') {
    return { status: 'permission-denied' };
  }

  const notificationId = await notifications.scheduleAt(input.when, {
    title: input.title,
    body: input.body,
    data: {
      targetType: input.targetType,
      ...(input.targetId ? { targetId: input.targetId } : {}),
    },
  });

  const reminder = await repositories.reminders.create({
    targetType: input.targetType,
    targetId: input.targetId,
    title: input.title,
    body: input.body ?? null,
    scheduledAt: input.when.toISOString(),
    repeat: 'none',
    notificationId,
    status: 'scheduled',
  });

  return { status: 'scheduled', reminder };
}

/** Cancela la notificación del sistema y borra la fila. */
export async function cancelReminder(reminder: Reminder): Promise<void> {
  if (reminder.notificationId) {
    await notifications.cancel(reminder.notificationId);
  }
  await repositories.reminders.remove(reminder.id);
}

/**
 * Elimina todos los recordatorios de una entidad.
 * Se llama al borrar la tarea o actividad a la que apuntan, para no dejar
 * notificaciones huérfanas sonando por algo que ya no existe.
 */
export async function cancelRemindersFor(
  targetType: ReminderTargetType,
  targetId: ID,
): Promise<void> {
  const existing = await repositories.reminders.listByTarget(targetType, targetId);
  await Promise.all(existing.map(cancelReminder));
}

/**
 * Reemplaza los recordatorios de una entidad por uno nuevo.
 * Es la operación natural al editar: la fecha cambió, el aviso anterior ya
 * no sirve.
 */
export async function replaceReminderFor(
  input: ScheduleReminderInput & { targetId: ID },
): Promise<ReminderOutcome> {
  await cancelRemindersFor(input.targetType, input.targetId);
  return scheduleReminder(input);
}

export async function hasReminder(
  targetType: ReminderTargetType,
  targetId: ID,
): Promise<boolean> {
  const existing = await repositories.reminders.listByTarget(targetType, targetId);
  return existing.some((reminder) => reminder.status === 'scheduled');
}

/**
 * Marca como entregados los recordatorios cuya hora ya pasó.
 *
 * El sistema operativo no avisa a la base de datos cuando dispara una
 * notificación, así que se reconcilia al arrancar la app.
 */
export async function refreshReminderStatuses(): Promise<void> {
  const all = await repositories.reminders.list();
  const now = nowISO();

  const delivered = all.filter(
    (reminder) => reminder.status === 'scheduled' && reminder.scheduledAt < now,
  );

  await Promise.all(
    delivered.map((reminder) =>
      repositories.reminders.update(reminder.id, { status: 'delivered' }),
    ),
  );
}

export function listUpcoming(limit?: number): Promise<Reminder[]> {
  return repositories.reminders.listUpcoming(limit);
}
