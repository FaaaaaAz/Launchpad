import { repositories } from '@/database';
import {
  cancelRemindersFor,
  replaceReminderFor,
  type ReminderOutcome,
} from '@/features/notifications/reminderService';
import type { DateOnly, ID, Task, TaskPriority, TimeOfDay } from '@/types';
import { combine, nowISO } from '@/utils/date';
import { ValidationError } from '@/utils/errors';

/**
 * Reglas de negocio de las tareas.
 *
 * Las pantallas no hablan con los repositorios: pasan por aquí. Así la
 * validación, el manejo de `completedAt` y la coordinación con los
 * recordatorios existen una sola vez.
 */

/** Lo que edita el formulario, con los tipos que maneja la UI. */
export interface TaskDraft {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: DateOnly | null;
  dueTime: TimeOfDay | null;
  categoryId: ID | null;
  activityId: ID | null;
  /** Si el usuario quiere que le avise una notificación. */
  reminderEnabled: boolean;
}

export interface TaskMutationResult {
  task: Task;
  /** `null` si la tarea no pedía recordatorio. */
  reminder: ReminderOutcome | null;
}

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;
/** Hora por defecto del aviso cuando la tarea tiene fecha pero no hora. */
const DEFAULT_REMINDER_HOUR = 9;

export const EMPTY_TASK_DRAFT: TaskDraft = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: null,
  dueTime: null,
  categoryId: null,
  activityId: null,
  reminderEnabled: false,
};

export function taskToDraft(task: Task, reminderEnabled: boolean): TaskDraft {
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    categoryId: task.categoryId,
    activityId: task.activityId,
    reminderEnabled,
  };
}

/** Devuelve los errores por campo. Vacío significa válido. */
export function validateTaskDraft(draft: TaskDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const title = draft.title.trim();

  if (title.length === 0) {
    errors.title = 'Ponle un título a la tarea.';
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.title = `Máximo ${MAX_TITLE_LENGTH} caracteres.`;
  }

  if (draft.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`;
  }

  if (draft.dueTime && !draft.dueDate) {
    errors.dueDate = 'Elige una fecha para poder usar una hora.';
  }

  if (draft.reminderEnabled && !draft.dueDate) {
    errors.dueDate = 'Un recordatorio necesita una fecha.';
  }

  return errors;
}

function assertValid(draft: TaskDraft): void {
  const errors = validateTaskDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}

function reminderDateFor(draft: TaskDraft): Date | null {
  if (!draft.dueDate) return null;
  return combine(draft.dueDate, draft.dueTime, DEFAULT_REMINDER_HOUR);
}

async function syncReminder(task: Task, draft: TaskDraft): Promise<ReminderOutcome | null> {
  if (!draft.reminderEnabled) {
    await cancelRemindersFor('task', task.id);
    return null;
  }

  const when = reminderDateFor(draft);
  if (!when) return null;

  return replaceReminderFor({
    targetType: 'task',
    targetId: task.id,
    title: task.title,
    body: task.description ?? 'Tienes una tarea pendiente.',
    when,
  });
}

export async function createTask(draft: TaskDraft): Promise<TaskMutationResult> {
  assertValid(draft);

  const task = await repositories.tasks.create({
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    status: 'pending',
    priority: draft.priority,
    dueDate: draft.dueDate,
    dueTime: draft.dueTime,
    categoryId: draft.categoryId,
    activityId: draft.activityId,
    completedAt: null,
  });

  return { task, reminder: await syncReminder(task, draft) };
}

export async function updateTask(id: ID, draft: TaskDraft): Promise<TaskMutationResult> {
  assertValid(draft);

  const task = await repositories.tasks.update(id, {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    priority: draft.priority,
    dueDate: draft.dueDate,
    dueTime: draft.dueTime,
    categoryId: draft.categoryId,
    activityId: draft.activityId,
  });

  return { task, reminder: await syncReminder(task, draft) };
}

/**
 * Alterna entre pendiente y completada.
 * Al completarse se cancela su recordatorio: avisar de algo ya hecho es ruido.
 */
export async function toggleTaskCompletion(task: Task): Promise<Task> {
  const nextStatus = task.status === 'completed' ? 'pending' : 'completed';

  const updated = await repositories.tasks.update(task.id, {
    status: nextStatus,
    completedAt: nextStatus === 'completed' ? nowISO() : null,
  });

  if (nextStatus === 'completed') {
    await cancelRemindersFor('task', task.id);
  }

  return updated;
}

export async function deleteTask(id: ID): Promise<void> {
  await cancelRemindersFor('task', id);
  await repositories.tasks.remove(id);
}

export function listTasks(): Promise<Task[]> {
  return repositories.tasks.list();
}

export function findTask(id: ID): Promise<Task | null> {
  return repositories.tasks.findById(id);
}
