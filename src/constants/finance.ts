import { colors } from '@/theme';
import type { FinanceKind } from '@/types';

import type { IconName } from './domains';

/**
 * Configuración de cada tipo de movimiento de la alcancía.
 *
 * Los colores son deliberadamente los funcionales (verde entra, rojo sale) y no
 * el amarillo de marca: en dinero, el color es información, no decoración.
 */
export interface FinanceKindConfig {
  value: FinanceKind;
  label: string;
  labelPlural: string;
  icon: IconName;
  color: string;
  softColor: string;
  /** Qué significa el campo `amount` para este tipo. */
  amountLabel: string;
  /** Texto de ayuda del formulario. */
  description: string;
  /** Si maneja un total y un acumulado (deudas y ahorros). */
  hasGoal: boolean;
  /** Etiqueta del total, cuando `hasGoal`. */
  targetLabel: string;
  /** Etiqueta del acumulado, cuando `hasGoal`. */
  settledLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  createLabel: string;
}

export const FINANCE_KIND_CONFIG: Record<FinanceKind, FinanceKindConfig> = {
  income: {
    value: 'income',
    label: 'Ingreso fijo',
    labelPlural: 'Ingresos fijos',
    icon: 'trending-up',
    color: colors.success,
    softColor: colors.successSoft,
    amountLabel: 'Monto mensual',
    description: 'Lo que entra cada mes: sueldo, mesada, alquiler que cobras.',
    hasGoal: false,
    targetLabel: '',
    settledLabel: '',
    emptyTitle: 'Sin ingresos registrados',
    emptyDescription: 'Agrega tu sueldo o cualquier entrada mensual para calcular cuánto te queda.',
    createLabel: 'Nuevo ingreso',
  },
  expense: {
    value: 'expense',
    label: 'Gasto fijo',
    labelPlural: 'Gastos fijos',
    icon: 'trending-down',
    color: colors.danger,
    softColor: colors.dangerSoft,
    amountLabel: 'Monto mensual',
    description: 'Lo que sale sí o sí: alquiler, internet, suscripciones, transporte.',
    hasGoal: false,
    targetLabel: '',
    settledLabel: '',
    emptyTitle: 'Sin gastos registrados',
    emptyDescription: 'Anota tus gastos fijos para saber con cuánto cuentas realmente cada mes.',
    createLabel: 'Nuevo gasto',
  },
  debt: {
    value: 'debt',
    label: 'Deuda',
    labelPlural: 'Deudas',
    icon: 'card',
    color: colors.warning,
    softColor: colors.warningSoft,
    amountLabel: 'Cuota mensual',
    description: 'Lo que debes y vas pagando por partes.',
    hasGoal: true,
    targetLabel: 'Total de la deuda',
    settledLabel: 'Ya pagado',
    emptyTitle: 'Sin deudas',
    emptyDescription: 'Si debes algo, regístralo aquí y ve cómo baja mes a mes.',
    createLabel: 'Nueva deuda',
  },
  saving: {
    value: 'saving',
    label: 'Ahorro',
    labelPlural: 'Ahorros',
    icon: 'wallet',
    color: colors.info,
    softColor: colors.infoSoft,
    amountLabel: 'Aporte mensual',
    description: 'Una meta a la que le vas metiendo dinero.',
    hasGoal: true,
    targetLabel: 'Meta',
    settledLabel: 'Ya ahorrado',
    emptyTitle: 'Sin metas de ahorro',
    emptyDescription: 'Define una meta y ve cuánto te falta cada vez que aportas.',
    createLabel: 'Nueva meta',
  },
};

/** Orden en que aparecen las secciones en la pantalla de finanzas. */
export const FINANCE_KIND_ORDER: FinanceKind[] = ['income', 'expense', 'debt', 'saving'];

export function getFinanceKindConfig(kind: FinanceKind): FinanceKindConfig {
  return FINANCE_KIND_CONFIG[kind];
}
