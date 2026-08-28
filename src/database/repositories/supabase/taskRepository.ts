import { TASK_PRIORITY_WEIGHT } from '@/constants';
import type { TaskRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { CreateInput, ID, Task, TaskPriority, TaskStatus, UpdateInput } from '@/types';
import { compareDateOnly } from '@/utils/date';
import { AppError } from '@/utils/errors';

import type { TaskFilter, TaskRepository } from '../types';
import {
  asEnum,
  defined,
  toISO,
  toISOOrNull,
  unwrapMany,
  unwrapMaybe,
  unwrapOne,
  unwrapVoid,
} from './rows';

const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'completed'];
const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high'];

function toDomain(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: asEnum(row.status, TASK_STATUSES, 'pending'),
    priority: asEnum(row.priority, TASK_PRIORITIES, 'medium'),
    dueDate: row.due_date,
    dueTime: row.due_time,
    categoryId: row.category_id,
    activityId: row.activity_id,
    completedAt: toISOOrNull(row.completed_at),
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

/**
 * Fila completa para el INSERT.
 *
 * `user_id` NO aparece a proposito: lo rellena el DEFAULT `auth.uid()` de la
 * tabla y la policy de INSERT comprueba que coincida. Si lo mandara el
 * cliente, seria un dato mas que puede llegar mal.
 *
 * Va aparte de `toPatch` porque insertar y actualizar no son lo mismo: al
 * insertar hay que dar TODAS las columnas obligatorias, y al actualizar solo
 * las que cambian. Compartir una funcion obligaria a que la de insertar
 * aceptara campos ausentes, y con ello se perderia justo la comprobacion que
 * hace falta.
 */
function toInsert(input: CreateInput<Task>) {
  return {
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate,
    due_time: input.dueTime,
    category_id: input.categoryId,
    activity_id: input.activityId,
    completed_at: input.completedAt,
  };
}

/** Columnas que cambian. Las ausentes se quedan como estaban. */
function toPatch(input: UpdateInput<Task>) {
  return defined({
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate,
    due_time: input.dueTime,
    category_id: input.categoryId,
    activity_id: input.activityId,
    completed_at: input.completedAt,
  });
}

/**
 * Orden de lectura: pendientes primero, luego fecha mas proxima, luego
 * prioridad, y a igualdad las mas recientes.
 *
 * En SQLite esto era un ORDER BY con expresiones CASE. PostgREST no admite
 * expresiones en `order`, y dos de los tres criterios no salen del orden
 * alfabetico de la columna: 'completed' va antes que 'pending', y la prioridad
 * ordenaria high, low, medium en vez de high, medium, low.
 *
 * Se ordena entonces aqui. Es aceptable porque la lista de tareas de una
 * persona se lee entera de todos modos --el dashboard necesita las de hoy y la
 * pantalla de tareas necesita todas--, asi que no hay paginacion cuyo orden
 * pudiera romperse. Si algun dia la hubiera, la solucion no es paginar sobre
 * este comparador sino crear una vista en Postgres con las claves de orden ya
 * calculadas.
 */
function byReadingOrder(a: Task, b: Task): number {
  if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;

  const byDate = compareDateOnly(a.dueDate, b.dueDate);
  if (byDate !== 0) return byDate;

  const byPriority = TASK_PRIORITY_WEIGHT[a.priority] - TASK_PRIORITY_WEIGHT[b.priority];
  if (byPriority !== 0) return byPriority;

  return a.createdAt < b.createdAt ? 1 : -1;
}

export const supabaseTaskRepository: TaskRepository = {
  async list(filter: TaskFilter = {}): Promise<Task[]> {
    // No se filtra por `user_id`: RLS ya limita la consulta a las filas
    // propias. Agregarlo aqui daria una falsa sensacion de que es lo que
    // protege los datos, cuando lo que protege es la policy.
    let query = supabase.from('tasks').select('*');

    if (filter.status) query = query.eq('status', filter.status);
    if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
    if (filter.activityId) query = query.eq('activity_id', filter.activityId);
    if (filter.dueOnOrBefore) {
      query = query.not('due_date', 'is', null).lte('due_date', filter.dueOnOrBefore);
    }

    const rows = unwrapMany(await query, 'cargar las tareas');
    return rows.map(toDomain).sort(byReadingOrder);
  },

  async findById(id: ID): Promise<Task | null> {
    const row = unwrapMaybe(
      await supabase.from('tasks').select('*').eq('id', id).maybeSingle(),
      'abrir la tarea',
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<Task>): Promise<Task> {
    // El id y las fechas los genera la base y vuelven en la respuesta:
    // `.select().single()` evita tener que releer la fila recien creada.
    const row = unwrapOne(
      await supabase.from('tasks').insert(toInsert(input)).select('*').single(),
      'crear la tarea',
    );
    return toDomain(row);
  },

  async update(id: ID, patch: UpdateInput<Task>): Promise<Task> {
    const row = unwrapMaybe(
      await supabase.from('tasks').update(toPatch(patch)).eq('id', id).select('*').maybeSingle(),
      'guardar la tarea',
    );

    // Sin fila de vuelta: o se borro, o nunca fue tuya. Desde el cliente son
    // indistinguibles --RLS hace que una fila ajena simplemente no exista-- y
    // el mensaje correcto es el mismo en los dos casos.
    if (!row) throw new AppError('La tarea ya no existe.', 'task_not_found');
    return toDomain(row);
  },

  async remove(id: ID): Promise<void> {
    unwrapVoid(await supabase.from('tasks').delete().eq('id', id), 'eliminar la tarea');
  },
};
