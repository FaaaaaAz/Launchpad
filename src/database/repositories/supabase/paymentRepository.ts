import type { PaymentRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { CreateInput, ID, Payment } from '@/types';

import type { PaymentRepository } from '../types';
import { toISO, toNumber, unwrapMany, unwrapOne, unwrapVoid } from './rows';

function toDomain(row: PaymentRow): Payment {
  return {
    id: row.id,
    activityId: row.activity_id,
    amount: toNumber(row.amount),
    currency: row.currency,
    paidAt: row.paid_at,
    coversUntil: row.covers_until,
    notes: row.notes,
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

export const supabasePaymentRepository: PaymentRepository = {
  async listByActivity(activityId: ID): Promise<Payment[]> {
    const rows = unwrapMany(
      await supabase
        .from('payments')
        .select('*')
        .eq('activity_id', activityId)
        // El historial se lee del pago mas reciente hacia atras. A igualdad de
        // fecha manda el orden de registro, que es el que distingue dos pagos
        // hechos el mismo dia.
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false }),
      'cargar los pagos',
    );
    return rows.map(toDomain);
  },

  async create(input: CreateInput<Payment>): Promise<Payment> {
    const row = unwrapOne(
      await supabase
        .from('payments')
        .insert({
          activity_id: input.activityId,
          amount: input.amount,
          currency: input.currency,
          paid_at: input.paidAt,
          covers_until: input.coversUntil,
          notes: input.notes,
        })
        .select('*')
        .single(),
      'registrar el pago',
    );
    return toDomain(row);
  },

  async remove(id: ID): Promise<void> {
    unwrapVoid(await supabase.from('payments').delete().eq('id', id), 'eliminar el pago');
  },
};
