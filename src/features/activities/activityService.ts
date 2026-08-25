import { DEFAULT_PAYMENT_REMINDER_DAYS, PAYMENT_DUE_SOON_DAYS } from '@/constants';
import { repositories } from '@/database';
import {
  cancelRemindersFor,
  replaceReminderFor,
  type ReminderOutcome,
} from '@/features/notifications/reminderService';
import { imageStorage } from '@/services/imageStorage';
import type {
  Activity,
  ActivityDomain,
  ActivityStatus,
  BillingCycle,
  DateOnly,
  ID,
  Payment,
  PaymentStatus,
  TimeOfDay,
  Weekday,
} from '@/types';
import { addDays, addMonths, combine, daysUntil, formatDateLong, today } from '@/utils/date';
import { ValidationError } from '@/utils/errors';
import { parseAmount } from '@/utils/format';

/**
 * Reglas de negocio de las actividades, compartidas por Ejercicio, Académico
 * y Hobbies.
 */

export interface ActivityDraft {
  name: string;
  subtitle: string;
  categoryId: ID | null;
  imageKey: string | null;
  location: string;
  status: ActivityStatus;
  weekdays: Weekday[];
  startTime: TimeOfDay | null;
  endTime: TimeOfDay | null;
  startDate: DateOnly | null;
  endDate: DateOnly | null;
  notes: string;
  billingCycle: BillingCycle;
  /** Texto crudo del input; se convierte a número al guardar. */
  billingAmount: string;
  currency: string;
  lastPaymentDate: DateOnly | null;
  nextPaymentDate: DateOnly | null;
  /** Avisar antes de que venza el próximo pago. */
  paymentReminderEnabled: boolean;
}

export interface ActivityMutationResult {
  activity: Activity;
  reminder: ReminderOutcome | null;
}

const MAX_NAME_LENGTH = 80;
const MAX_SUBTITLE_LENGTH = 120;
const REMINDER_HOUR = 9;

export function createEmptyDraft(currency: string): ActivityDraft {
  return {
    name: '',
    subtitle: '',
    categoryId: null,
    imageKey: null,
    location: '',
    status: 'active',
    weekdays: [],
    startTime: null,
    endTime: null,
    startDate: null,
    endDate: null,
    notes: '',
    billingCycle: 'none',
    billingAmount: '',
    currency,
    lastPaymentDate: null,
    nextPaymentDate: null,
    paymentReminderEnabled: false,
  };
}

export function activityToDraft(
  activity: Activity,
  paymentReminderEnabled: boolean,
): ActivityDraft {
  return {
    name: activity.name,
    subtitle: activity.subtitle ?? '',
    categoryId: activity.categoryId,
    imageKey: activity.imageKey,
    location: activity.location ?? '',
    status: activity.status,
    weekdays: activity.weekdays,
    startTime: activity.startTime,
    endTime: activity.endTime,
    startDate: activity.startDate,
    endDate: activity.endDate,
    notes: activity.notes ?? '',
    billingCycle: activity.billingCycle,
    billingAmount: activity.billingAmount === null ? '' : String(activity.billingAmount),
    currency: activity.currency,
    lastPaymentDate: activity.lastPaymentDate,
    nextPaymentDate: activity.nextPaymentDate,
    paymentReminderEnabled,
  };
}

/* -------------------------------------------------------------------------- */
/* Cálculos de pago                                                           */
/* -------------------------------------------------------------------------- */

/**
 * El estado de pago se CALCULA, no se guarda.
 *
 * Si se almacenara, quedaría obsoleto en cuanto pasara la fecha sin que la app
 * se abriera, y la card mostraría "Pagada" sobre una membresía vencida.
 */
export function getPaymentStatus(
  activity: Activity,
  reference: DateOnly = today(),
): PaymentStatus {
  if (activity.billingCycle === 'none' || !activity.nextPaymentDate) return 'none';

  const remaining = daysUntil(activity.nextPaymentDate, reference);
  if (remaining < 0) return 'overdue';
  if (remaining <= PAYMENT_DUE_SOON_DAYS) return 'due';
  return 'paid';
}

/** Avanza una fecha un ciclo. Devuelve null si el ciclo no se repite. */
export function advancePaymentDate(from: DateOnly, cycle: BillingCycle): DateOnly | null {
  switch (cycle) {
    case 'weekly':
      return addDays(from, 7);
    case 'monthly':
      return addMonths(from, 1);
    case 'quarterly':
      return addMonths(from, 3);
    case 'yearly':
      return addMonths(from, 12);
    case 'oneTime':
    case 'none':
      return null;
  }
}

/**
 * Calcula el próximo vencimiento tras registrar un pago.
 *
 * Avanza desde el vencimiento anterior para no desalinear el ciclo (un pago
 * atrasado el día 15 no debe mover la mensualidad del día 10 al 15), pero
 * sigue avanzando hasta superar la fecha de pago si venía muy atrasado.
 */
function nextDueAfterPayment(activity: Activity, paidAt: DateOnly): DateOnly | null {
  const cycle = activity.billingCycle;
  let candidate = activity.nextPaymentDate ?? paidAt;

  // Tope de seguridad: evita un bucle infinito si los datos son incoherentes.
  for (let step = 0; step < 120; step += 1) {
    const next = advancePaymentDate(candidate, cycle);
    if (!next) return null;
    candidate = next;
    if (daysUntil(candidate, paidAt) > 0) return candidate;
  }

  return candidate;
}

/* -------------------------------------------------------------------------- */
/* Validación                                                                 */
/* -------------------------------------------------------------------------- */

export function validateActivityDraft(draft: ActivityDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = draft.name.trim();

  if (name.length === 0) {
    errors.name = 'Ponle un nombre.';
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Máximo ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (draft.subtitle.length > MAX_SUBTITLE_LENGTH) {
    errors.subtitle = `Máximo ${MAX_SUBTITLE_LENGTH} caracteres.`;
  }

  if (draft.billingCycle !== 'none') {
    const amount = parseAmount(draft.billingAmount);
    if (amount === null || amount <= 0) {
      errors.billingAmount = 'Indica cuánto cuesta.';
    }
  }

  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    errors.endDate = 'El vencimiento no puede ser anterior al inicio.';
  }

  if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) {
    errors.endTime = 'La hora de fin debe ser posterior a la de inicio.';
  }

  if (draft.paymentReminderEnabled && !draft.nextPaymentDate) {
    errors.nextPaymentDate = 'Indica la fecha del próximo pago para poder avisarte.';
  }

  return errors;
}

function assertValid(draft: ActivityDraft): void {
  const errors = validateActivityDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}

/* -------------------------------------------------------------------------- */
/* Escritura                                                                  */
/* -------------------------------------------------------------------------- */

function draftToEntityFields(draft: ActivityDraft) {
  const hasBilling = draft.billingCycle !== 'none';

  return {
    name: draft.name.trim(),
    subtitle: draft.subtitle.trim() || null,
    categoryId: draft.categoryId,
    imageKey: draft.imageKey,
    location: draft.location.trim() || null,
    status: draft.status,
    weekdays: draft.weekdays,
    startTime: draft.startTime,
    endTime: draft.endTime,
    startDate: draft.startDate,
    endDate: draft.endDate,
    notes: draft.notes.trim() || null,
    billingCycle: draft.billingCycle,
    billingAmount: hasBilling ? parseAmount(draft.billingAmount) : null,
    currency: draft.currency,
    lastPaymentDate: hasBilling ? draft.lastPaymentDate : null,
    nextPaymentDate: hasBilling ? draft.nextPaymentDate : null,
  };
}

async function syncPaymentReminder(
  activity: Activity,
  enabled: boolean,
): Promise<ReminderOutcome | null> {
  if (!enabled || !activity.nextPaymentDate) {
    await cancelRemindersFor('payment', activity.id);
    return null;
  }

  const noticeDay = addDays(activity.nextPaymentDate, -DEFAULT_PAYMENT_REMINDER_DAYS);
  const when = combine(noticeDay, null, REMINDER_HOUR);
  if (!when) return null;

  return replaceReminderFor({
    targetType: 'payment',
    targetId: activity.id,
    title: `${activity.name}: pago próximo`,
    body: `Vence el ${formatDateLong(activity.nextPaymentDate)}.`,
    when,
  });
}

export async function createActivity(
  domain: ActivityDomain,
  draft: ActivityDraft,
): Promise<ActivityMutationResult> {
  assertValid(draft);

  const activity = await repositories.activities.create({
    domain,
    ...draftToEntityFields(draft),
  });

  return {
    activity,
    reminder: await syncPaymentReminder(activity, draft.paymentReminderEnabled),
  };
}

export async function updateActivity(
  current: Activity,
  draft: ActivityDraft,
): Promise<ActivityMutationResult> {
  assertValid(draft);

  const activity = await repositories.activities.update(current.id, draftToEntityFields(draft));

  // Si se cambió la foto, la anterior queda huérfana ocupando espacio.
  if (current.imageKey && current.imageKey !== draft.imageKey) {
    await imageStorage.remove(current.imageKey);
  }

  return {
    activity,
    reminder: await syncPaymentReminder(activity, draft.paymentReminderEnabled),
  };
}

/** Borra la actividad y todo lo que dependía de ella. */
export async function deleteActivity(activity: Activity): Promise<void> {
  await cancelRemindersFor('payment', activity.id);
  await cancelRemindersFor('activity', activity.id);
  await imageStorage.remove(activity.imageKey);
  await repositories.activities.remove(activity.id);
}

export interface RegisterPaymentInput {
  amount: number;
  paidAt: DateOnly;
  notes?: string | null;
}

/**
 * Registra un pago: lo guarda en el historial, avanza el próximo vencimiento
 * y reprograma el aviso.
 */
export async function registerPayment(
  activity: Activity,
  input: RegisterPaymentInput,
): Promise<{ activity: Activity; payment: Payment }> {
  const nextPaymentDate = nextDueAfterPayment(activity, input.paidAt);

  const payment = await repositories.payments.create({
    activityId: activity.id,
    amount: input.amount,
    currency: activity.currency,
    paidAt: input.paidAt,
    coversUntil: nextPaymentDate,
    notes: input.notes ?? null,
  });

  const updated = await repositories.activities.update(activity.id, {
    lastPaymentDate: input.paidAt,
    nextPaymentDate,
  });

  // El aviso anterior apuntaba al vencimiento viejo: hay que rehacerlo.
  const hadReminder =
    (await repositories.reminders.listByTarget('payment', activity.id)).length > 0;
  await syncPaymentReminder(updated, hadReminder);

  return { activity: updated, payment };
}

export function listPayments(activityId: ID): Promise<Payment[]> {
  return repositories.payments.listByActivity(activityId);
}
