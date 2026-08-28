import type { CreateInput, FinanceEntry, FinanceKind, ID, UpdateInput } from '@/types';
import { nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/id';

import { getDatabase } from '../../database';
import { asEnum, boolToInt, buildAssignments, intToBool, type SqlValue } from '../../sql';
import type { FinanceFilter, FinanceRepository } from '../types';

interface FinanceRow {
  id: string;
  kind: string;
  name: string;
  amount: number;
  currency: string;
  target_amount: number | null;
  settled_amount: number | null;
  due_day: number | null;
  last_settled_month: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const KINDS: readonly FinanceKind[] = ['income', 'expense', 'debt', 'saving'];

/**
 * Activos primero; dentro de cada grupo, los que tienen día de vencimiento
 * ordenados por ese día, que es como uno los repasa a fin de mes.
 */
const ORDER_BY = `
  ORDER BY
    is_active DESC,
    CASE WHEN due_day IS NULL THEN 1 ELSE 0 END,
    due_day ASC,
    name COLLATE NOCASE ASC
`;

function toDomain(row: FinanceRow): FinanceEntry {
  return {
    id: row.id,
    kind: asEnum(row.kind, KINDS, 'expense'),
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    targetAmount: row.target_amount,
    settledAmount: row.settled_amount,
    dueDay: row.due_day,
    lastSettledMonth: row.last_settled_month,
    notes: row.notes,
    isActive: intToBool(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColumns(
  input: Partial<CreateInput<FinanceEntry>>,
): Record<string, SqlValue | undefined> {
  return {
    kind: input.kind,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    target_amount: input.targetAmount,
    settled_amount: input.settledAmount,
    due_day: input.dueDay,
    last_settled_month: input.lastSettledMonth,
    notes: input.notes,
    is_active: input.isActive === undefined ? undefined : boolToInt(input.isActive),
  };
}

export const sqliteFinanceRepository: FinanceRepository = {
  async list(filter: FinanceFilter = {}): Promise<FinanceEntry[]> {
    const db = await getDatabase();
    const conditions: string[] = [];
    const values: SqlValue[] = [];

    if (filter.kind) {
      conditions.push('kind = ?');
      values.push(filter.kind);
    }
    if (filter.onlyActive) {
      conditions.push('is_active = 1');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await db.getAllAsync<FinanceRow>(
      `SELECT * FROM finance_entries ${where} ${ORDER_BY}`,
      values,
    );

    return rows.map(toDomain);
  },

  async findById(id: ID): Promise<FinanceEntry | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<FinanceRow>(
      'SELECT * FROM finance_entries WHERE id = ?',
      [id],
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<FinanceEntry>): Promise<FinanceEntry> {
    const db = await getDatabase();
    const timestamp = nowISO();
    const entry: FinanceEntry = {
      ...input,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.runAsync(
      `INSERT INTO finance_entries
         (id, kind, name, amount, currency, target_amount, settled_amount,
          due_day, last_settled_month, notes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.kind,
        entry.name,
        entry.amount,
        entry.currency,
        entry.targetAmount,
        entry.settledAmount,
        entry.dueDay,
        entry.lastSettledMonth,
        entry.notes,
        boolToInt(entry.isActive),
        entry.createdAt,
        entry.updatedAt,
      ],
    );

    return entry;
  },

  async update(id: ID, patch: UpdateInput<FinanceEntry>): Promise<FinanceEntry> {
    const db = await getDatabase();
    const { clause, values } = buildAssignments(toColumns(patch));
    const setClause = clause ? `${clause}, updated_at = ?` : 'updated_at = ?';

    const result = await db.runAsync(
      `UPDATE finance_entries SET ${setClause} WHERE id = ?`,
      [...values, nowISO(), id],
    );

    if (result.changes === 0) {
      throw new AppError('Este movimiento ya no existe.', 'finance_not_found');
    }

    const updated = await this.findById(id);
    if (!updated) throw new AppError('Este movimiento ya no existe.', 'finance_not_found');
    return updated;
  },

  async remove(id: ID): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM finance_entries WHERE id = ?', [id]);
  },
};
