import { useEffect } from 'react';

import { refreshReminderStatuses } from './reminderService';

/**
 * Reconcilia los recordatorios con la realidad al entrar en la app.
 *
 * El sistema operativo no avisa a la base de datos cuando dispara una
 * notificación, así que al arrancar se marcan como entregados los que ya
 * pasaron de hora.
 *
 * Antes esto vivía en `DatabaseProvider`, junto a la apertura de SQLite. Dejó
 * de valer cuando los recordatorios se mudaron a Supabase: allí se ejecutaba
 * ANTES de saber si había sesión, así que la consulta salía sin identificar a
 * nadie, RLS la rechazaba y la reconciliación no llegaba a ocurrir nunca. El
 * `try/catch` de aquel provider lo ocultaba en un aviso de consola.
 *
 * Ahora se monta dentro de la sesión, que es cuando la consulta tiene sentido.
 *
 * No dibuja nada: es un efecto con forma de componente, para que el orden de
 * montaje quede escrito en el layout y no escondido en un provider.
 */
export function ReminderSync() {
  useEffect(() => {
    // Los recordatorios son secundarios: si esto falla, la app debe seguir
    // funcionando sin ellos en lugar de no abrir.
    void refreshReminderStatuses().catch((error: unknown) => {
      console.warn('[Launchpad] No se pudieron reconciliar los recordatorios:', error);
    });
  }, []);

  return null;
}
