import { repositories } from '@/database';
import type { ActivityEvent, ActivityEventKind, DateOnly, ID } from '@/types';
import { monthOf, today } from '@/utils/date';

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
  });
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
