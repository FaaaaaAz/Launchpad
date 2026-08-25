import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { repositories } from '@/database';
import type { Activity, ActivityDomain, ID, Payment } from '@/types';
import { toUserMessage } from '@/utils/errors';

import * as activityService from './activityService';
import type { ActivityDraft, ActivityMutationResult, RegisterPaymentInput } from './activityService';

interface ActivitiesContextValue {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Búsqueda en memoria: la lista completa ya está cargada. */
  getById: (id: ID) => Activity | undefined;
  byDomain: (domain: ActivityDomain) => Activity[];
  createActivity: (domain: ActivityDomain, draft: ActivityDraft) => Promise<ActivityMutationResult>;
  updateActivity: (current: Activity, draft: ActivityDraft) => Promise<ActivityMutationResult>;
  deleteActivity: (activity: Activity) => Promise<void>;
  registerPayment: (activity: Activity, input: RegisterPaymentInput) => Promise<Payment>;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

/**
 * Estado compartido de actividades para los tres módulos (Ejercicio,
 * Académico, Hobbies) y el dashboard.
 */
export function ActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setActivities(await repositories.activities.list());
    } catch (cause) {
      setError(toUserMessage(cause, 'No se pudieron cargar las actividades.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<ActivitiesContextValue>(
    () => ({
      activities,
      isLoading,
      error,
      refresh,

      getById: (id) => activities.find((activity) => activity.id === id),
      byDomain: (domain) => activities.filter((activity) => activity.domain === domain),

      createActivity: async (domain, draft) => {
        const result = await activityService.createActivity(domain, draft);
        await refresh();
        return result;
      },

      updateActivity: async (current, draft) => {
        const result = await activityService.updateActivity(current, draft);
        await refresh();
        return result;
      },

      deleteActivity: async (activity) => {
        await activityService.deleteActivity(activity);
        await refresh();
      },

      registerPayment: async (activity, input) => {
        const { payment } = await activityService.registerPayment(activity, input);
        await refresh();
        return payment;
      },
    }),
    [activities, isLoading, error, refresh],
  );

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}

export function useActivities(): ActivitiesContextValue {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error('useActivities debe usarse dentro de <ActivitiesProvider>.');
  }
  return context;
}
