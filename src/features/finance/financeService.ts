import { getFinanceKindConfig } from '@/constants';
import { repositories } from '@/database';
import type { FinanceEntry, FinanceKind, ID } from '@/types';
import { currentMonth } from '@/utils/date';
import { ValidationError } from '@/utils/errors';
import { parseAmount } from '@/utils/format';

/**
 * Reglas de negocio de la alcancía.
 *
 * El control mensual se apoya en `lastSettledMonth`: guardar el mes cubierto
 * en vez de un booleano hace que todo se reinicie solo al cambiar de mes.
 */

/** Lo que edita el formulario, con los tipos que maneja la UI. */
export interface FinanceDraft {
  kind: FinanceKind;
  name: string;
  /** Texto crudo del input. */
  amount: string;
  targetAmount: string;
  settledAmount: string;
  /** Día del mes, como texto. */
  dueDay: string;
  notes: string;
  isActive: boolean;
}

const MAX_NAME_LENGTH = 60;

export function createEmptyDraft(kind: FinanceKind): FinanceDraft {
  return {
    kind,
    name: '',
    amount: '',
    targetAmount: '',
    settledAmount: '',
    dueDay: '',
    notes: '',
    isActive: true,
  };
}

export function entryToDraft(entry: FinanceEntry): FinanceDraft {
  const asText = (value: number | null) => (value === null ? '' : String(value));

  return {
    kind: entry.kind,
    name: entry.name,
    amount: entry.amount === 0 ? '' : String(entry.amount),
    targetAmount: asText(entry.targetAmount),
    settledAmount: asText(entry.settledAmount),
    dueDay: entry.dueDay === null ? '' : String(entry.dueDay),
    notes: entry.notes ?? '',
    isActive: entry.isActive,
  };
}

/* -------------------------------------------------------------------------- */
/* Control mensual                                                            */
/* -------------------------------------------------------------------------- */

/** Si el movimiento ya está cubierto en el mes en curso. */
export function isSettledThisMonth(
  entry: FinanceEntry,
  month: string = currentMonth(),
): boolean {
  return entry.lastSettledMonth === month;
}

/** Cuánto falta para completar una deuda o una meta de ahorro. */
export function remainingFor(entry: FinanceEntry): number {
  if (entry.targetAmount === null) return 0;
  return Math.max(0, entry.targetAmount - (entry.settledAmount ?? 0));
}

/** Progreso de 0 a 1 de una deuda o meta. Vale 0 si no hay total definido. */
export function progressFor(entry: FinanceEntry): number {
  if (!entry.targetAmount || entry.targetAmount <= 0) return 0;
  return Math.min(1, (entry.settledAmount ?? 0) / entry.targetAmount);
}

/* -------------------------------------------------------------------------- */
/* Validación                                                                 */
/* -------------------------------------------------------------------------- */

export function validateFinanceDraft(draft: FinanceDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const config = getFinanceKindConfig(draft.kind);
  const name = draft.name.trim();

  if (name.length === 0) {
    errors.name = 'Ponle un nombre.';
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Máximo ${MAX_NAME_LENGTH} caracteres.`;
  }

  const amount = parseAmount(draft.amount);

  // Para ingresos y gastos el monto ES el movimiento, así que es obligatorio.
  // En deudas y ahorros la cuota puede no estar definida todavía.
  if (!config.hasGoal && (amount === null || amount <= 0)) {
    errors.amount = 'Indica el monto mensual.';
  }
  if (config.hasGoal && draft.amount.trim() !== '' && amount === null) {
    errors.amount = 'Monto inválido.';
  }

  if (config.hasGoal) {
    const target = parseAmount(draft.targetAmount);
    if (target === null || target <= 0) {
      errors.targetAmount = `Indica ${config.targetLabel.toLowerCase()}.`;
    }

    if (draft.settledAmount.trim() !== '') {
      const settled = parseAmount(draft.settledAmount);
      if (settled === null) {
        errors.settledAmount = 'Monto inválido.';
      } else if (target !== null && settled > target) {
        errors.settledAmount = 'No puede superar el total.';
      }
    }
  }

  if (draft.dueDay.trim() !== '') {
    const day = Number(draft.dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      errors.dueDay = 'Un día entre 1 y 31.';
    }
  }

  return errors;
}

function assertValid(draft: FinanceDraft): void {
  const errors = validateFinanceDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
}

/* -------------------------------------------------------------------------- */
/* Escritura                                                                  */
/* -------------------------------------------------------------------------- */

function draftToFields(draft: FinanceDraft, currency: string) {
  const config = getFinanceKindConfig(draft.kind);
  const dueDay = draft.dueDay.trim() === '' ? null : Number(draft.dueDay);

  return {
    kind: draft.kind,
    name: draft.name.trim(),
    amount: parseAmount(draft.amount) ?? 0,
    currency,
    targetAmount: config.hasGoal ? parseAmount(draft.targetAmount) : null,
    settledAmount: config.hasGoal ? (parseAmount(draft.settledAmount) ?? 0) : null,
    dueDay,
    notes: draft.notes.trim() || null,
    isActive: draft.isActive,
  };
}

export async function createEntry(
  draft: FinanceDraft,
  currency: string,
): Promise<FinanceEntry> {
  assertValid(draft);

  return repositories.finance.create({
    ...draftToFields(draft, currency),
    lastSettledMonth: null,
  });
}

export async function updateEntry(
  id: ID,
  draft: FinanceDraft,
  currency: string,
): Promise<FinanceEntry> {
  assertValid(draft);
  return repositories.finance.update(id, draftToFields(draft, currency));
}

export async function deleteEntry(id: ID): Promise<void> {
  await repositories.finance.remove(id);
}

/**
 * Marca el mes en curso como cubierto.
 *
 * En deudas y ahorros, además de marcar el mes, suma la cuota al acumulado:
 * es el gesto que hace avanzar la barra de progreso.
 */
export async function settleMonth(entry: FinanceEntry): Promise<FinanceEntry> {
  const config = getFinanceKindConfig(entry.kind);

  const nextSettled = config.hasGoal
    ? Math.min(
        entry.targetAmount ?? Number.MAX_SAFE_INTEGER,
        (entry.settledAmount ?? 0) + entry.amount,
      )
    : entry.settledAmount;

  return repositories.finance.update(entry.id, {
    lastSettledMonth: currentMonth(),
    settledAmount: nextSettled,
  });
}

/** Deshace el marcado del mes, devolviendo el acumulado a su valor anterior. */
export async function unsettleMonth(entry: FinanceEntry): Promise<FinanceEntry> {
  const config = getFinanceKindConfig(entry.kind);

  const nextSettled = config.hasGoal
    ? Math.max(0, (entry.settledAmount ?? 0) - entry.amount)
    : entry.settledAmount;

  return repositories.finance.update(entry.id, {
    lastSettledMonth: null,
    settledAmount: nextSettled,
  });
}

export function listEntries(): Promise<FinanceEntry[]> {
  return repositories.finance.list();
}
