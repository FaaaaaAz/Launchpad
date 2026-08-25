import type { Task } from '@/types';
import { daysUntil, today } from '@/utils/date';

/**
 * Funciones puras que derivan vistas de la lista de tareas.
 *
 * Están fuera de los componentes para poder probarlas y para que el dashboard
 * y la pantalla de tareas compartan exactamente los mismos criterios: si
 * "atrasada" significa algo, significa lo mismo en toda la app.
 */

export interface TaskSummary {
  total: number;
  pending: number;
  completed: number;
  /** Pendientes con fecha límite anterior a hoy. */
  overdue: number;
  dueToday: number;
  /** 0 a 1. Vale 0 cuando no hay tareas, para no dividir por cero. */
  progress: number;
}

export function isOverdue(task: Task, reference: string = today()): boolean {
  if (task.status === 'completed' || !task.dueDate) return false;
  return daysUntil(task.dueDate, reference) < 0;
}

export function isDueToday(task: Task, reference: string = today()): boolean {
  return task.status === 'pending' && task.dueDate === reference;
}

export function summarizeTasks(tasks: Task[], reference: string = today()): TaskSummary {
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const total = tasks.length;

  return {
    total,
    completed,
    pending: total - completed,
    overdue: tasks.filter((task) => isOverdue(task, reference)).length,
    dueToday: tasks.filter((task) => isDueToday(task, reference)).length,
    progress: total === 0 ? 0 : completed / total,
  };
}

export interface DayScope {
  /** Todo lo que cuenta para hoy, completado o no. */
  tasks: Task[];
  /** Solo lo que sigue pendiente. */
  pending: Task[];
  total: number;
  completed: number;
  overdue: number;
}

/**
 * El alcance del día: lo que vence hoy más lo que quedó atrasado.
 *
 * Las tareas ya completadas se incluyen en el total para que el porcentaje de
 * progreso avance al marcarlas; si se excluyeran, completar una tarea haría
 * que el total bajara y la barra no se movería.
 */
export function selectDayScope(tasks: Task[], reference: string = today()): DayScope {
  const scoped = tasks.filter(
    (task) => task.dueDate === reference || isOverdue(task, reference),
  );

  const pending = scoped.filter((task) => task.status === 'pending');

  return {
    tasks: scoped,
    pending,
    total: scoped.length,
    completed: scoped.length - pending.length,
    overdue: scoped.filter((task) => isOverdue(task, reference)).length,
  };
}

/**
 * Lo que corresponde hacer hoy: vencidas primero, luego las de hoy.
 * Es lo que alimenta el bloque principal del dashboard.
 */
export function selectTodayTasks(tasks: Task[], reference: string = today()): Task[] {
  return tasks.filter(
    (task) => isOverdue(task, reference) || isDueToday(task, reference),
  );
}

/** Pendientes con fecha futura, ordenadas por cercanía. */
export function selectUpcomingTasks(
  tasks: Task[],
  limit: number,
  reference: string = today(),
): Task[] {
  return tasks
    .filter(
      (task) =>
        task.status === 'pending' &&
        task.dueDate !== null &&
        daysUntil(task.dueDate, reference) > 0,
    )
    .slice(0, limit);
}

export type TaskFilterKey = 'today' | 'pending' | 'all';

export const TASK_FILTERS: { key: TaskFilterKey; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'all', label: 'Todas' },
];

export function applyTaskFilter(
  tasks: Task[],
  filter: TaskFilterKey,
  reference: string = today(),
): Task[] {
  switch (filter) {
    case 'today':
      return selectTodayTasks(tasks, reference);
    case 'pending':
      return tasks.filter((task) => task.status === 'pending');
    case 'all':
      return tasks;
  }
}
