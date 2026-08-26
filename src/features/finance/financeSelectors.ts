import type { FinanceEntry, FinanceKind } from '@/types';
import { currentMonth } from '@/utils/date';

import { isSettledThisMonth, remainingFor } from './financeService';

/** Funciones puras que derivan los números de la alcancía. */

export interface FinanceSummary {
  /** Suma de ingresos fijos mensuales. */
  income: number;
  /** Suma de gastos fijos mensuales. */
  expense: number;
  /** Cuotas de deuda comprometidas cada mes. */
  debtPayments: number;
  /** Aportes de ahorro comprometidos cada mes. */
  savingContributions: number;
  /**
   * Lo que queda libre cada mes tras cubrir gastos, cuotas y aportes.
   * Es el número que responde a «¿con cuánto cuento realmente?».
   */
  available: number;
  /** Total que aún se debe. */
  debtRemaining: number;
  /** Total ya ahorrado. */
  saved: number;
  /** Suma de las metas de ahorro. */
  savingGoal: number;
  /** Movimientos con día de vencimiento que aún no se marcan este mes. */
  pendingThisMonth: number;
  /** Cuántos movimientos hay en total (activos). */
  activeCount: number;
}

function sum(entries: FinanceEntry[], pick: (entry: FinanceEntry) => number): number {
  return entries.reduce((total, entry) => total + pick(entry), 0);
}

export function summarizeFinance(
  entries: FinanceEntry[],
  month: string = currentMonth(),
): FinanceSummary {
  const active = entries.filter((entry) => entry.isActive);
  const byKind = (kind: FinanceKind) => active.filter((entry) => entry.kind === kind);

  const income = sum(byKind('income'), (entry) => entry.amount);
  const expense = sum(byKind('expense'), (entry) => entry.amount);
  const debtPayments = sum(byKind('debt'), (entry) => entry.amount);
  const savingContributions = sum(byKind('saving'), (entry) => entry.amount);

  return {
    income,
    expense,
    debtPayments,
    savingContributions,
    available: income - expense - debtPayments - savingContributions,
    debtRemaining: sum(byKind('debt'), remainingFor),
    saved: sum(byKind('saving'), (entry) => entry.settledAmount ?? 0),
    savingGoal: sum(byKind('saving'), (entry) => entry.targetAmount ?? 0),
    pendingThisMonth: active.filter(
      (entry) => entry.dueDay !== null && !isSettledThisMonth(entry, month),
    ).length,
    activeCount: active.length,
  };
}

export function filterByKind(entries: FinanceEntry[], kind: FinanceKind): FinanceEntry[] {
  return entries.filter((entry) => entry.kind === kind);
}

/**
 * Movimientos con fecha que faltan por cubrir este mes, del día más cercano al
 * más lejano. Alimenta el aviso del dashboard.
 */
export function selectPendingThisMonth(
  entries: FinanceEntry[],
  month: string = currentMonth(),
): FinanceEntry[] {
  return entries
    .filter(
      (entry) =>
        entry.isActive && entry.dueDay !== null && !isSettledThisMonth(entry, month),
    )
    .sort((a, b) => (a.dueDay ?? 0) - (b.dueDay ?? 0));
}
