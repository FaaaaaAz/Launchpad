import { repositories } from '@/database';
import type { Activity, ActivityEvent, ActivityEventKind, DateOnly, ID, Weekday } from '@/types';
import { addDays, addMonths, monthOf, parseDateOnly, today } from '@/utils/date';

/**
 * Los días anotados en el calendario de una actividad: entrenamientos y
 * competencias.
 */

export interface CreateEventInput {
  activityId: ID;
  date: DateOnly;
  kind: ActivityEventKind;
  title?: string | null;
}

export function createEvent(input: CreateEventInput): Promise<ActivityEvent> {
  return repositories.activityEvents.create({
    activityId: input.activityId,
    date: input.date,
    kind: input.kind,
    title: input.title?.trim() || null,
    notes: null,
    // Los días pasados se anotan ya cumplidos: si lo apuntas después, es
    // porque ocurrió.
    completed: input.date < today(),
    isGenerated: false,
  });
}

/* -------------------------------------------------------------------------- */
/* Entrenamientos automáticos                                                 */
/* -------------------------------------------------------------------------- */

export interface TrainingCoverage {
  from: DateOnly;
  to: DateOnly;
}

/** Cuántos meses cubre cada ciclo de cobro. */
const CYCLE_MONTHS: Record<string, number> = {
  weekly: 1,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * Hasta dónde se rellenan los entrenamientos automáticamente.
 *
 * El periodo lo marca lo que el usuario ya pagó: con cuota mensual se llena un
 * mes y ahí se detiene. Así el calendario no se convierte en una repetición
 * infinita que nadie pidió, y volver a llenarlo es un gesto consciente.
 *
 * Sin cuota se usa un mes, que es el horizonte con el que la gente planifica.
 */
export function trainingCoverage(
  activity: Activity,
  reference: DateOnly = today(),
): TrainingCoverage | null {
  if (activity.weekdays.length === 0) return null;

  // Si la actividad empieza más adelante, se cubre desde esa fecha.
  const from =
    activity.startDate && activity.startDate > reference ? activity.startDate : reference;

  const months = CYCLE_MONTHS[activity.billingCycle] ?? 1;
  let to = addDays(addMonths(from, months), -1);

  // Nunca más allá del vencimiento de la membresía.
  if (activity.endDate && activity.endDate < to) to = activity.endDate;

  return to < from ? null : { from, to };
}

/** Fechas del periodo que caen en los días de entrenamiento elegidos. */
export function trainingDatesIn(
  coverage: TrainingCoverage,
  weekdays: Weekday[],
): DateOnly[] {
  const wanted = new Set(weekdays);
  const dates: DateOnly[] = [];

  let cursor = coverage.from;
  // Tope de seguridad por si las fechas vinieran incoherentes.
  for (let step = 0; step < 400 && cursor <= coverage.to; step += 1) {
    const parsed = parseDateOnly(cursor);
    if (parsed && wanted.has(parsed.getDay() as Weekday)) dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

/**
 * Rehace los entrenamientos automáticos de una actividad.
 *
 * Solo toca los días generados por la app y solo de hoy en adelante: lo que el
 * usuario anotó a mano (partidos, días extra) y el historial pasado quedan
 * intactos. Tampoco pisa un día que ya tenga un entrenamiento anotado.
 */
export async function syncGeneratedTrainings(activity: Activity): Promise<void> {
  const reference = today();
  await repositories.activityEvents.removeGeneratedFrom(activity.id, reference);

  const coverage = trainingCoverage(activity, reference);
  if (!coverage || activity.status === 'archived') return;

  const existing = await repositories.activityEvents.listByActivity(activity.id);
  const taken = new Set(
    existing.filter((event) => event.kind === 'training').map((event) => event.date),
  );

  const pending = trainingDatesIn(coverage, activity.weekdays).filter(
    (date) => !taken.has(date),
  );

  await repositories.activityEvents.createMany(
    pending.map((date) => ({
      activityId: activity.id,
      date,
      kind: 'training' as const,
      title: null,
      notes: null,
      completed: false,
      isGenerated: true,
    })),
  );
}

export function deleteEvent(id: ID): Promise<void> {
  return repositories.activityEvents.remove(id);
}

export function toggleEventCompleted(event: ActivityEvent): Promise<ActivityEvent> {
  return repositories.activityEvents.update(event.id, { completed: !event.completed });
}

export function listEvents(activityId: ID): Promise<ActivityEvent[]> {
  return repositories.activityEvents.listByActivity(activityId);
}

/* -------------------------------------------------------------------------- */
/* Selectores                                                                 */
/* -------------------------------------------------------------------------- */

/** Índice por fecha, para que el calendario resuelva cada día sin recorrer todo. */
export function groupByDate(events: ActivityEvent[]): Map<DateOnly, ActivityEvent[]> {
  const map = new Map<DateOnly, ActivityEvent[]>();
  for (const event of events) {
    const existing = map.get(event.date);
    if (existing) existing.push(event);
    else map.set(event.date, [event]);
  }
  return map;
}

/** El próximo día anotado, de hoy en adelante. */
export function nextEvent(
  events: ActivityEvent[],
  reference: DateOnly = today(),
): ActivityEvent | undefined {
  return events
    .filter((event) => event.date >= reference)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

export interface MonthStats {
  trainings: number;
  matches: number;
  completed: number;
  total: number;
}

/** Resumen del mes que se está mirando, para el pie del calendario. */
export function statsForMonth(events: ActivityEvent[], month: string): MonthStats {
  const scoped = events.filter((event) => monthOf(event.date) === month);

  return {
    trainings: scoped.filter((event) => event.kind === 'training').length,
    matches: scoped.filter((event) => event.kind === 'match').length,
    completed: scoped.filter((event) => event.completed).length,
    total: scoped.length,
  };
}
