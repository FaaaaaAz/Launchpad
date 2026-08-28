import type { FinanceEntryRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { CreateInput, FinanceEntry, FinanceKind, ID, UpdateInput } from '@/types';
import { AppError } from '@/utils/errors';

import type { FinanceFilter, FinanceRepository } from '../types';
import {
  asEnum,
  defined,
  toISO,
  toNumber,
  toNumberOrNull,
  unwrapMany,
  unwrapMaybe,
  unwrapOne,
  unwrapVoid,
} from './rows';

const KINDS: readonly FinanceKind[] = ['income', 'expense', 'debt', 'saving'];

function toDomain(row: FinanceEntryRow): FinanceEntry {
  return {
    id: row.id,
    kind: asEnum(row.kind, KINDS, 'expense'),
    name: row.name,
    amount: toNumber(row.amount),
    currency: row.currency,
    targetAmount: toNumberOrNull(row.target_amount),
    settledAmount: toNumberOrNull(row.settled_amount),
    dueDay: row.due_day,
    lastSettledMonth: row.last_settled_month,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

/**
 * Fila completa para el INSERT.
 *
 * `user_id` no aparece: lo pone el DEFAULT `auth.uid()` y lo verifica la
 * policy. Va aparte de `toPatch` porque insertar exige TODAS las columnas
 * obligatorias y actualizar solo las que cambian.
 */
function toInsert(input: CreateInput<FinanceEntry>) {
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
    is_active: input.isActive,
  };
}

/** Columnas que cambian. Las ausentes se quedan como estaban. */
function toPatch(input: UpdateInput<FinanceEntry>) {
  return defined({
    kind: input.kind,
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    target_amount: input.targetAmount,
    settled_amount: input.settledAmount,
    due_day: input.dueDay,
    last_settled_month: input.lastSettledMonth,
    notes: input.notes,
    is_active: input.isActive,
  });
}

/**
 * Activos primero; dentro de cada grupo, los que tienen dia de vencimiento
 * ordenados por ese dia, que es como se repasan a fin de mes. Los que no
 * tienen dia van al final.
 */
function byReadingOrder(a: FinanceEntry, b: FinanceEntry): number {
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;

  if (a.dueDay !== b.dueDay) {
    if (a.dueDay === null) return 1;
    if (b.dueDay === null) return -1;
    return a.dueDay - b.dueDay;
  }

  const left = a.name.toLowerCase();
  const right = b.name.toLowerCase();
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export const supabaseFinanceRepository: FinanceRepository = {
  async list(filter: FinanceFilter = {}): Promise<FinanceEntry[]> {
    let query = supabase.from('finance_entries').select('*');

    if (filter.kind) query = query.eq('kind', filter.kind);
    if (filter.onlyActive) query = query.eq('is_active', true);

    const rows = unwrapMany(await query, 'cargar la alcancía');
    return rows.map(toDomain).sort(byReadingOrder);
  },

  async findById(id: ID): Promise<FinanceEntry | null> {
    const row = unwrapMaybe(
      await supabase.from('finance_entries').select('*').eq('id', id).maybeSingle(),
      'abrir el movimiento',
    );
    return row ? toDomain(row) : null;
  },

  async create(input: CreateInput<FinanceEntry>): Promise<FinanceEntry> {
    const row = unwrapOne(
      await supabase.from('finance_entries').insert(toInsert(input)).select('*').single(),
      'crear el movimiento',
    );
    return toDomain(row);
  },

  async update(id: ID, patch: UpdateInput<FinanceEntry>): Promise<FinanceEntry> {
    const row = unwrapMaybe(
      await supabase
        .from('finance_entries')
        .update(toPatch(patch))
        .eq('id', id)
        .select('*')
        .maybeSingle(),
      'guardar el movimiento',
    );

    if (!row) throw new AppError('Ese movimiento ya no existe.', 'finance_not_found');
    return toDomain(row);
  },

  async remove(id: ID): Promise<void> {
    unwrapVoid(
      await supabase.from('finance_entries').delete().eq('id', id),
      'eliminar el movimiento',
    );
  },
};
