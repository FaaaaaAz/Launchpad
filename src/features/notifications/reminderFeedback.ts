import { Alert } from 'react-native';

import type { ReminderOutcome } from './reminderService';

/**
 * Avisa cuando un recordatorio pedido no llegó a programarse.
 *
 * Guardar la tarea y no avisar nada sería peor: el usuario creería que le
 * vamos a recordar algo que en realidad nunca va a sonar.
 */
export function notifyReminderOutcome(outcome: ReminderOutcome | null): void {
  if (!outcome || outcome.status === 'scheduled') return;

  if (outcome.status === 'permission-denied') {
    Alert.alert(
      'Guardado sin recordatorio',
      'Launchpad necesita permiso para enviarte notificaciones. Puedes activarlo desde los Ajustes de tu teléfono.',
    );
    return;
  }

  Alert.alert(
    'Guardado sin recordatorio',
    'La fecha elegida ya pasó, así que no había nada que programar.',
  );
}
