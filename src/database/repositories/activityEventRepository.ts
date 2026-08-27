import type {
  ActivityEvent,
  ActivityEventKind,
  CreateInput,
  DateOnly,
  ID,
  UpdateInput,
} from '@/types';
import { nowISO, today } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/id';

import { getDatabase } from '../database';
import { asEnum, boolToInt, buildAssignments, intToBool, type SqlValue } from '../sql';
import type { ActivityEventRepository } from './types';

interface ActivityEventRow {
  id: string;
  activity_id: string;
  date: string;
  kind: string;
  title: string | null;
  notes: string | null;
  completed: number;
  is_generated: number;
  created_at: string;
  updated_at: string;
}

const KINDS: readonly ActivityEventKind[] = ['training', 'match'];

function toDomain(row: ActivityEventRow): ActivityEvent {
  return {
    id: row.id,
    activityId: row.activity_id,
    date: row.date,
    kind: asEnum(row.kind, KINDS, 'training'),
    title: row.title,
    notes: row.notes,
    completed: intToBool(row.completed),
    isGenerated: intToBool(row.is_generated),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(
  input: Partial<CreateInput<ActivityEvent>>,
): Record<string, SqlValue | undefined> {
  return {
    activity_id: input.activityId,
    date: input.date,
    kind: input.kind,
    title: input.title,
    notes: input.notes,
    completed: input.completed === undefined ? undefined : boolToInt(input.completed),
    is_generated:
      input.isGenerated === undefined ? undefined : boolToInt(input.isGenerated),
  };
}

export const sqliteActivityEventRepository: ActivityEventRepository = {
  async listByActivity(activityId: ID): Promise<ActivityEvent[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ActivityEventRow>(
      'SELECT * FROM activity_events WHERE activity_id = ? ORDER BY date ASC',
      [activityId],
    );
    return rows.map(toDomain);
  },

  /**
   * Próximo evento de cada actividad, de hoy en adelante.
   *
   * Resuelto en una sola consulta con una subconsulta correlacionada: la
   * alternativa —traer todos los eventos y filtrar en JavaScript— crecería
   * sin límite con el tiempo.
   */
  async listNextByActivity(): Promise<Map<ID, ActivityEvent>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ActivityEventRow>(
      `SELECT * FROM activity_events AS outer_event
       WHERE date >= ?
         AND date = (
           SELECT MIN(date) FROM activity_events
           WHERE activity_id = outer_event.activity_id AND date >= ?
         )
       ORDER BY date ASC`,
      [today(), today()],
    );

    const result = new Map<ID, ActivityEvent>();
    for (const row of rows) {
      // Si un día tiene varios eventos, se queda el primero que llega.
      if (!result.has(row.activity_id)) result.set(row.activity_id, toDomain(row));
    }
    return result;
  },

  /**
   * Inserta varios días en una sola transacción.
   *
   * Un mes de entrenamientos son entre 4 y 12 filas; hacerlas una a una
   * dispararía ese número de escrituras a disco en vez de una.
   */
  async createMany(inputs: CreateInput<ActivityEvent>[]): Promise<void> {
    if (inputs.length === 0) return;

    const db = await getDatabase();
    const timestamp = nowISO();

    await db.withExclusiveTransactionAsync(async (txn) => {
      for (const input of inputs) {
        await txn.runAsync(
          `INSERT INTO activity_events
             (id, activity_id, date, kind, title, notes, completed, is_generated,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            createId(),
            input.activityId,
            input.date,
            input.kind,
            input.title,
            input.notes,
            boolToInt(input.completed),
            boolToInt(input.isGenerated),
            timestamp,
            timestamp,
          ],
        );
      }
    });
  },

  async removeGeneratedFrom(activityId: ID, from: DateOnly): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM activity_events WHERE activity_id = ? AND is_generated = 1 AND date >= ?',
      [activityId, from],
    );
  },

  async findById(id: ID): Promise<ActivityEvent | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ActivityEventRow>(
      'SELECT * FROM activity_events WHERE id = ?',
      [id],
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<ActivityEvent>): Promise<ActivityEvent> {
    const db = await getDatabase();
    const timestamp = nowISO();
    const event: ActivityEvent = {
      ...input,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.runAsync(
      `INSERT INTO activity_events
         (id, activity_id, date, kind, title, notes, completed, is_generated,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.activityId,
        event.date,
        event.kind,
        event.title,
        event.notes,
        boolToInt(event.completed),
        boolToInt(event.isGenerated),
        event.createdAt,
        event.updatedAt,
      ],
    );

    return event;
  },

  async update(id: ID, patch: UpdateInput<ActivityEvent>): Promise<ActivityEvent> {
    const db = await getDatabase();
    const { clause, values } = buildAssignments(toColumns(patch));
    const setClause = clause ? `${clause}, updated_at = ?` : 'updated_at = ?';

    const result = await db.runAsync(
      `UPDATE activity_events SET ${setClause} WHERE id = ?`,
      [...values, nowISO(), id],
    );

    if (result.changes === 0) {
      throw new AppError('Este día ya no está anotado.', 'event_not_found');
    }

    const updated = await this.findById(id);
    if (!updated) throw new AppError('Este día ya no está anotado.', 'event_not_found');
    return updated;
  },

  async remove(id: ID): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM activity_events WHERE id = ?', [id]);
  },
};
