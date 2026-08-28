import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { getDatabase } from '@/database';
import { prepareNotifications } from '@/services/notifications';
import { toUserMessage } from '@/utils/errors';

export type DatabaseStatus = 'loading' | 'ready' | 'error';

interface DatabaseContextValue {
  status: DatabaseStatus;
  error: string | null;
  retry: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

/**
 * Arranca la persistencia antes de que se monte el resto de la app.
 *
 * Nada puede leer datos hasta que las migraciones terminen, así que este
 * provider es el que decide si la aplicación muestra el contenido, un
 * indicador de carga o una pantalla de error con reintento.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DatabaseStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      await getDatabase();
    } catch (cause) {
      setError(toUserMessage(cause, 'No se pudo abrir la base de datos local.'));
      setStatus('error');
      return;
    }

    // Las notificaciones son secundarias: si algo falla aquí, la app debe
    // seguir funcionando sin recordatorios en vez de no abrir.
    //
    // Aquí solo se prepara el canal, que es cosa del dispositivo y no necesita
    // cuenta. La reconciliación de los recordatorios ya pasados vive en
    // `features/notifications/ReminderSync`, dentro de la sesión: desde que
    // están en Supabase, consultarlos antes de saber quién eres devuelve un
    // error de permisos y no reconcilia nada.
    try {
      await prepareNotifications();
    } catch (cause) {
      console.warn('[Launchpad] No se pudieron preparar las notificaciones:', cause);
    }

    setStatus('ready');
  }, []);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const value = useMemo<DatabaseContextValue>(
    () => ({ status, error, retry: () => void initialize() }),
    [status, error, initialize],
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabaseStatus(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseStatus debe usarse dentro de <DatabaseProvider>.');
  }
  return context;
}
