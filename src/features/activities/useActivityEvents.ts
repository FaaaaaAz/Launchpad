import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ActivityEvent, ID } from '@/types';
import { toUserMessage } from '@/utils/errors';

import * as eventService from './activityEventService';
import type { CreateEventInput } from './activityEventService';

/**
 * Eventos de una actividad concreta.
 *
 * Vive como hook y no como contexto global porque solo la pantalla de detalle
 * los necesita: cargarlos todos al arrancar la app sería trabajo inútil que
 * además crecería con los años de uso.
 */
export function useActivityEvents(activityId: ID | undefined) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activityId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setEvents(await eventService.listEvents(activityId));
    } catch (cause) {
      setError(toUserMessage(cause, 'No se pudo cargar el calendario.'));
    } finally {
      setIsLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byDate = useMemo(() => eventService.groupByDate(events), [events]);

  return useMemo(
    () => ({
      events,
      byDate,
      isLoading,
      error,
      refresh,

      addEvent: async (input: Omit<CreateEventInput, 'activityId'>) => {
        if (!activityId) return;
        await eventService.createEvent({ ...input, activityId });
        await refresh();
      },

      removeEvent: async (id: ID) => {
        await eventService.deleteEvent(id);
        await refresh();
      },

      toggleCompleted: async (event: ActivityEvent) => {
        await eventService.toggleEventCompleted(event);
        await refresh();
      },
    }),
    [events, byDate, isLoading, error, refresh, activityId],
  );
}
