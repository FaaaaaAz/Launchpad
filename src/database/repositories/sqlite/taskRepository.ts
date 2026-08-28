import type { CreateInput, ID, Task, TaskPriority, TaskStatus, UpdateInput } from '@/types';
import { nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/id';

import { getDatabase } from '../../database';
import { asEnum, buildAssignments, type SqlValue } from '../../sql';
import type { TaskFilter, TaskRepository } from '../types';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  category_id: string | null;
  activity_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'completed'];
const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high'];

/**
 * Orden de lectura de las tareas:
 * pendientes primero, luego las que tienen fecha más próxima, luego prioridad.
 * Es el orden en que uno realmente quiere verlas, así que se resuelve en SQL
 * y no en JavaScript.
 */
const ORDER_BY = `
  ORDER BY
    CASE status WHEN 'pending' THEN 0 ELSE 1 END,
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
    due_date ASC,
    CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
    created_at DESC
`;

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
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(input: Partial<CreateInput<Task>>): Record<string, SqlValue | undefined> {
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

export const sqliteTaskRepository: TaskRepository = {
  async list(filter: TaskFilter = {}): Promise<Task[]> {
    const db = await getDatabase();
    const conditions: string[] = [];
    const values: SqlValue[] = [];

    if (filter.status) {
      conditions.push('status = ?');
      values.push(filter.status);
    }
    if (filter.categoryId) {
      conditions.push('category_id = ?');
      values.push(filter.categoryId);
    }
    if (filter.activityId) {
      conditions.push('activity_id = ?');
      values.push(filter.activityId);
    }
    if (filter.dueOnOrBefore) {
      conditions.push('due_date IS NOT NULL AND due_date <= ?');
      values.push(filter.dueOnOrBefore);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await db.getAllAsync<TaskRow>(
      `SELECT * FROM tasks ${where} ${ORDER_BY}`,
      values,
    );

    return rows.map(toDomain);
  },

  async findById(id: ID): Promise<Task | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<Task>): Promise<Task> {
    const db = await getDatabase();
    const timestamp = nowISO();
    const task: Task = { ...input, id: createId(), createdAt: timestamp, updatedAt: timestamp };

    await db.runAsync(
      `INSERT INTO tasks
         (id, title, description, status, priority, due_date, due_time,
          category_id, activity_id, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.dueDate,
        task.dueTime,
        task.categoryId,
        task.activityId,
        task.completedAt,
        task.createdAt,
        task.updatedAt,
      ],
    );

    return task;
  },

  async update(id: ID, patch: UpdateInput<Task>): Promise<Task> {
    const db = await getDatabase();
    const { clause, values } = buildAssignments(toColumns(patch));
    const updatedAt = nowISO();

    const setClause = clause ? `${clause}, updated_at = ?` : 'updated_at = ?';
    const result = await db.runAsync(`UPDATE tasks SET ${setClause} WHERE id = ?`, [
      ...values,
      updatedAt,
      id,
    ]);

    if (result.changes === 0) {
      throw new AppError('La tarea ya no existe.', 'task_not_found');
    }

    const updated = await this.findById(id);
    if (!updated) throw new AppError('La tarea ya no existe.', 'task_not_found');
    return updated;
  },

  async remove(id: ID): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
  },
};
