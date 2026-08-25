import type { Activity, ActivityDomain, DateOnly, PaymentStatus, Weekday } from '@/types';
import { compareDateOnly, daysUntil, today } from '@/utils/date';

import { getPaymentStatus } from './activityService';

/** Funciones puras que derivan vistas de la lista de actividades. */

/** Actividades activas que tocan hoy según su día de la semana. */
export function selectActivitiesForDay(
  activities: Activity[],
  weekday: Weekday = new Date().getDay() as Weekday,
): Activity[] {
  return activities.filter(
    (activity) => activity.status === 'active' && activity.weekdays.includes(weekday),
  );
}

export interface PaymentAlert {
  activity: Activity;
  status: PaymentStatus;
  /** Días que faltan. Negativo si ya venció. */
  daysRemaining: number;
}

/**
 * Pagos que requieren atención (vencidos o por vencer), del más urgente al
 * menos urgente. Es el bloque de dinero del dashboard.
 */
export function selectPaymentAlerts(
  activities: Activity[],
  reference: DateOnly = today(),
): PaymentAlert[] {
  return activities
    .filter((activity) => activity.status !== 'archived')
    .map((activity) => ({
      activity,
      status: getPaymentStatus(activity, reference),
      daysRemaining: activity.nextPaymentDate
        ? daysUntil(activity.nextPaymentDate, reference)
        : Number.MAX_SAFE_INTEGER,
    }))
    .filter((alert) => alert.status === 'due' || alert.status === 'overdue')
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/** Próximos vencimientos de membresía o de curso, ordenados por fecha. */
export function selectUpcomingExpirations(
  activities: Activity[],
  limit: number,
  reference: DateOnly = today(),
): Activity[] {
  return activities
    .filter(
      (activity) =>
        activity.status === 'active' &&
        activity.endDate !== null &&
        daysUntil(activity.endDate, reference) >= 0,
    )
    .sort((a, b) => compareDateOnly(a.endDate, b.endDate))
    .slice(0, limit);
}

export function countByDomain(activities: Activity[]): Record<ActivityDomain, number> {
  const counts: Record<ActivityDomain, number> = { exercise: 0, academic: 0, hobby: 0 };

  for (const activity of activities) {
    if (activity.status === 'archived') continue;
    counts[activity.domain] += 1;
  }

  return counts;
}

export function filterByDomain(
  activities: Activity[],
  domain: ActivityDomain,
): Activity[] {
  return activities.filter((activity) => activity.domain === domain);
}
