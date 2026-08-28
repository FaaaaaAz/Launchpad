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
import { createId } from '@/utils/id';

import { getDatabase } from '../../database';
import { asEnum, buildAssignments, type SqlValue } from '../../sql';
import type { ReminderRepository } from '../types';

interface ReminderRow {
  id: string;
  target_type: string;
  target_id: string | null;
  title: string;
  body: string | null;
  scheduled_at: string;
  repeat_rule: string;
  notification_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const TARGET_TYPES: readonly ReminderTargetType[] = [
  'task',
  'activity',
  'payment',
  'routine',
  'custom',
];
const REPEATS: readonly ReminderRepeat[] = ['none', 'daily', 'weekly'];
const STATUSES: readonly ReminderStatus[] = ['scheduled', 'delivered', 'cancelled'];

function toDomain(row: ReminderRow): Reminder {
  return {
    id: row.id,
    targetType: asEnum(row.target_type, TARGET_TYPES, 'custom'),
    targetId: row.target_id,
    title: row.title,
    body: row.body,
    scheduledAt: row.scheduled_at,
    repeat: asEnum(row.repeat_rule, REPEATS, 'none'),
    notificationId: row.notification_id,
    status: asEnum(row.status, STATUSES, 'scheduled'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(
  input: Partial<CreateInput<Reminder>>,
): Record<string, SqlValue | undefined> {
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

export const sqliteReminderRepository: ReminderRepository = {
  async list(): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ReminderRow>(
      'SELECT * FROM reminders ORDER BY scheduled_at ASC',
    );
    return rows.map(toDomain);
  },

  /** Solo los recordatorios futuros que siguen programados. */
  async listUpcoming(limit = 20): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ReminderRow>(
      `SELECT * FROM reminders
       WHERE status = 'scheduled' AND scheduled_at >= ?
       ORDER BY scheduled_at ASC
       LIMIT ?`,
      [nowISO(), limit],
    );
    return rows.map(toDomain);
  },

  async listByTarget(targetType: ReminderTargetType, targetId: ID): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ReminderRow>(
      'SELECT * FROM reminders WHERE target_type = ? AND target_id = ? ORDER BY scheduled_at ASC',
      [targetType, targetId],
    );
    return rows.map(toDomain);
  },

  async findById(id: ID): Promise<Reminder | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ReminderRow>(
      'SELECT * FROM reminders WHERE id = ?',
      [id],
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<Reminder>): Promise<Reminder> {
    const db = await getDatabase();
    const timestamp = nowISO();
    const reminder: Reminder = {
      ...input,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.runAsync(
      `INSERT INTO reminders
         (id, target_type, target_id, title, body, scheduled_at, repeat_rule,
          notification_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reminder.id,
        reminder.targetType,
        reminder.targetId,
        reminder.title,
        reminder.body,
        reminder.scheduledAt,
        reminder.repeat,
        reminder.notificationId,
        reminder.status,
        reminder.createdAt,
        reminder.updatedAt,
      ],
    );

    return reminder;
  },

  async update(id: ID, patch: UpdateInput<Reminder>): Promise<Reminder> {
    const db = await getDatabase();
    const { clause, values } = buildAssignments(toColumns(patch));
    const setClause = clause ? `${clause}, updated_at = ?` : 'updated_at = ?';

    const result = await db.runAsync(`UPDATE reminders SET ${setClause} WHERE id = ?`, [
      ...values,
      nowISO(),
      id,
    ]);

    if (result.changes === 0) {
      throw new AppError('El recordatorio ya no existe.', 'reminder_not_found');
    }

    const updated = await this.findById(id);
    if (!updated) throw new AppError('El recordatorio ya no existe.', 'reminder_not_found');
    return updated;
  },

  async remove(id: ID): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
  },
};
