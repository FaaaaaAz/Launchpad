import type { CreateInput, ID, Payment } from '@/types';
import { nowISO } from '@/utils/date';
import { createId } from '@/utils/id';

import { getDatabase } from '../../database';
import type { PaymentRepository } from '../types';

interface PaymentRow {
  id: string;
  activity_id: string;
  amount: number;
  currency: string;
  paid_at: string;
  covers_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toDomain(row: PaymentRow): Payment {
  return {
    id: row.id,
    activityId: row.activity_id,
    amount: row.amount,
    currency: row.currency,
    paidAt: row.paid_at,
    coversUntil: row.covers_until,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const sqlitePaymentRepository: PaymentRepository = {
  async listByActivity(activityId: ID): Promise<Payment[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<PaymentRow>(
      'SELECT * FROM payments WHERE activity_id = ? ORDER BY paid_at DESC, created_at DESC',
      [activityId],
    );
    return rows.map(toDomain);
  },

  async create(input: CreateInput<Payment>): Promise<Payment> {
    const db = await getDatabase();
    const timestamp = nowISO();
    const payment: Payment = {
      ...input,
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.runAsync(
      `INSERT INTO payments
         (id, activity_id, amount, currency, paid_at, covers_until, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.id,
        payment.activityId,
        payment.amount,
        payment.currency,
        payment.paidAt,
        payment.coversUntil,
        payment.notes,
        payment.createdAt,
        payment.updatedAt,
      ],
    );

    return payment;
  },

  async remove(id: ID): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM payments WHERE id = ?', [id]);
  },
};
