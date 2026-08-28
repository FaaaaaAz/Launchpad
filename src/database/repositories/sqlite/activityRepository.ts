import type {
  Activity,
  ActivityDomain,
  ActivityStatus,
  BillingCycle,
  CreateInput,
  ID,
  UpdateInput,
} from '@/types';
import { nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/id';

import { getDatabase } from '../../database';
import {
  asEnum,
  buildAssignments,
  parseWeekdays,
  serializeWeekdays,
  type SqlValue,
} from '../../sql';
import type { ActivityFilter, ActivityRepository } from '../types';

interface ActivityRow {
  id: string;
  domain: string;
  name: string;
  subtitle: string | null;
  category_id: string | null;
  image_key: string | null;
  location: string | null;
  sport_key: string | null;
  status: string;
  weekdays: string;
  start_time: string | null;
  end_time: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  billing_cycle: string;
  billing_amount: number | null;
  currency: string;
  last_payment_date: string | null;
  next_payment_date: string | null;
  created_at: string;
  updated_at: string;
}

const DOMAINS: readonly ActivityDomain[] = ['exercise', 'academic', 'hobby'];
const STATUSES: readonly ActivityStatus[] = ['active', 'paused', 'archived'];
const BILLING_CYCLES: readonly BillingCycle[] = [
  'none',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'oneTime',
];
/** Activas primero, y dentro de cada estado por nombre. */
const ORDER_BY = `
  ORDER BY
    CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END,
    name COLLATE NOCASE ASC
`;

function toDomain(row: ActivityRow): Activity {
  return {
    id: row.id,
    domain: asEnum(row.domain, DOMAINS, 'hobby'),
    name: row.name,
    subtitle: row.subtitle,
    categoryId: row.category_id,
    imageKey: row.image_key,
    location: row.location,
    sportKey: row.sport_key,
    status: asEnum(row.status, STATUSES, 'active'),
    weekdays: parseWeekdays(row.weekdays),
    startTime: row.start_time,
    endTime: row.end_time,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    billingCycle: asEnum(row.billing_cycle, BILLING_CYCLES, 'none'),
    billingAmount: row.billing_amount,
    currency: row.currency,
    lastPaymentDate: row.last_payment_date,
    nextPaymentDate: row.next_payment_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(
  input: Partial<CreateInput<Activity>>,
): Record<string, SqlValue | undefined> {
  return {
    domain: input.domain,
    name: input.name,
    subtitle: input.subtitle,
    category_id: input.categoryId,
    image_key: input.imageKey,
    location: input.location,
    sport_key: input.sportKey,
    status: input.status,
    weekdays: input.weekdays ? serializeWeekdays(input.weekdays) : undefined,
    start_time: input.startTime,
    end_time: input.endTime,
    start_date: input.startDate,
    end_date: input.endDate,
    notes: input.notes,
    billing_cycle: input.billingCycle,
    billing_amount: input.billingAmount,
    currency: input.currency,
    last_payment_date: input.lastPaymentDate,
    next_payment_date: input.nextPaymentDate,
  };
}

export const sqliteActivityRepository: ActivityRepository = {
  async list(filter: ActivityFilter = {}): Promise<Activity[]> {
    const db = await getDatabase();
    const conditions: string[] = [];
    const values: SqlValue[] = [];

    if (filter.domain) {
      conditions.push('domain = ?');
      values.push(filter.domain);
    }
    if (filter.status) {
      conditions.push('status = ?');
      values.push(filter.status);
    }
    if (filter.excludeArchived) {
      conditions.push("status != 'archived'");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await db.getAllAsync<ActivityRow>(
      `SELECT * FROM activities ${where} ${ORDER_BY}`,
      values,
    );

    return rows.map(toDomain);
  },

  async findById(id: ID): Promise<Activity | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ActivityRow>(
      'SELECT * FROM activities WHERE id = ?',
      [id],
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<Activity>): Promise<Activity> {
    const db = await getDatabase();
    const timestamp = nowISO();
    const activity: Activity = {
      ...input,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.runAsync(
      `INSERT INTO activities
         (id, domain, name, subtitle, category_id, image_key, location, sport_key, status,
          weekdays, start_time, end_time, start_date, end_date, notes,
          billing_cycle, billing_amount, currency,
          last_payment_date, next_payment_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.id,
        activity.domain,
        activity.name,
        activity.subtitle,
        activity.categoryId,
        activity.imageKey,
        activity.location,
        activity.sportKey,
        activity.status,
        serializeWeekdays(activity.weekdays),
        activity.startTime,
        activity.endTime,
        activity.startDate,
        activity.endDate,
        activity.notes,
        activity.billingCycle,
        activity.billingAmount,
        activity.currency,
        activity.lastPaymentDate,
        activity.nextPaymentDate,
        activity.createdAt,
        activity.updatedAt,
      ],
    );

    return activity;
  },

  async update(id: ID, patch: UpdateInput<Activity>): Promise<Activity> {
    const db = await getDatabase();
    const { clause, values } = buildAssignments(toColumns(patch));
    const setClause = clause ? `${clause}, updated_at = ?` : 'updated_at = ?';

    const result = await db.runAsync(`UPDATE activities SET ${setClause} WHERE id = ?`, [
      ...values,
      nowISO(),
      id,
    ]);

    if (result.changes === 0) {
      throw new AppError('La actividad ya no existe.', 'activity_not_found');
    }

    const updated = await this.findById(id);
    if (!updated) throw new AppError('La actividad ya no existe.', 'activity_not_found');
    return updated;
  },

  async remove(id: ID): Promise<void> {
    const db = await getDatabase();
    // Los pagos se borran en cascada por la FK; las tareas asociadas
    // conservan su vínculo en NULL (ON DELETE SET NULL).
    await db.runAsync('DELETE FROM activities WHERE id = ?', [id]);
  },
};
