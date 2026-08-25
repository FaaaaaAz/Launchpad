import { colors } from '@/theme';
import type {
  ActivityStatus,
  BillingCycle,
  PaymentStatus,
  TaskPriority,
} from '@/types';

import type { IconName } from './domains';

/** Descriptor de un valor de enumeración, listo para pintar en la UI. */
export interface OptionMeta<T extends string> {
  value: T;
  label: string;
  color: string;
  /** Fondo tenue para badges. */
  softColor: string;
  icon?: IconName;
}

/* -------------------------------------------------------------------------- */
/* Prioridad de tareas                                                        */
/* -------------------------------------------------------------------------- */

export const TASK_PRIORITY_META: Record<TaskPriority, OptionMeta<TaskPriority>> = {
  high: {
    value: 'high',
    label: 'Alta',
    color: colors.danger,
    softColor: colors.dangerSoft,
    icon: 'arrow-up',
  },
  medium: {
    value: 'medium',
    label: 'Media',
    color: colors.warning,
    softColor: colors.warningSoft,
    icon: 'remove',
  },
  low: {
    value: 'low',
    label: 'Baja',
    color: colors.info,
    softColor: colors.infoSoft,
    icon: 'arrow-down',
  },
};

/** De mayor a menor urgencia: define también el orden de los chips. */
export const TASK_PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low'];

/** Peso numérico para ordenar listas de tareas. */
export const TASK_PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/* -------------------------------------------------------------------------- */
/* Estado de actividad                                                        */
/* -------------------------------------------------------------------------- */

export const ACTIVITY_STATUS_META: Record<ActivityStatus, OptionMeta<ActivityStatus>> = {
  active: {
    value: 'active',
    label: 'Activa',
    color: colors.success,
    softColor: colors.successSoft,
    icon: 'play',
  },
  paused: {
    value: 'paused',
    label: 'En pausa',
    color: colors.warning,
    softColor: colors.warningSoft,
    icon: 'pause',
  },
  archived: {
    value: 'archived',
    label: 'Archivada',
    color: colors.textMuted,
    softColor: colors.neutralSoft,
    icon: 'archive',
  },
};

export const ACTIVITY_STATUS_ORDER: ActivityStatus[] = ['active', 'paused', 'archived'];

/* -------------------------------------------------------------------------- */
/* Estado de pago                                                             */
/* -------------------------------------------------------------------------- */

export const PAYMENT_STATUS_META: Record<PaymentStatus, OptionMeta<PaymentStatus>> = {
  none: {
    value: 'none',
    label: 'Sin costo',
    color: colors.textMuted,
    softColor: colors.neutralSoft,
  },
  paid: {
    value: 'paid',
    label: 'Pagada',
    color: colors.success,
    softColor: colors.successSoft,
    icon: 'checkmark-circle',
  },
  due: {
    value: 'due',
    label: 'Por vencer',
    color: colors.warning,
    softColor: colors.warningSoft,
    icon: 'time',
  },
  overdue: {
    value: 'overdue',
    label: 'Vencida',
    color: colors.danger,
    softColor: colors.dangerSoft,
    icon: 'alert-circle',
  },
};

/* -------------------------------------------------------------------------- */
/* Ciclo de cobro                                                             */
/* -------------------------------------------------------------------------- */

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  none: 'Sin costo',
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
  oneTime: 'Pago único',
};

export const BILLING_CYCLE_ORDER: BillingCycle[] = [
  'none',
  'monthly',
  'weekly',
  'quarterly',
  'yearly',
  'oneTime',
];

/** Cuántos días antes del vencimiento avisar por defecto. */
export const DEFAULT_PAYMENT_REMINDER_DAYS = 2;

/** Umbral en días para marcar una membresía como 'por vencer'. */
export const PAYMENT_DUE_SOON_DAYS = 5;
