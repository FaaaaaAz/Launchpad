import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Envoltorio delgado sobre expo-notifications.
 *
 * Todo lo que sabe de notificaciones del sistema vive aquí; el resto de la app
 * habla con `reminderService`, que combina esto con la base de datos.
 *
 * Alcance en Expo Go: las notificaciones LOCALES (las que programa el propio
 * dispositivo, que es todo lo que Launchpad necesita) funcionan sin problema.
 * Las notificaciones push remotas sí requerirían un development build, pero
 * no forman parte de esta etapa.
 */

/** Cómo se muestra una notificación con la app abierta. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const REMINDERS_CHANNEL_ID = 'launchpad-reminders';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface NotificationContent {
  title: string;
  body?: string | null;
  /** Datos que viajan con la notificación (para navegar al tocarla más adelante). */
  data?: Record<string, string>;
}

/**
 * Prepara el canal de Android. En iOS no hace nada.
 * Debe llamarse una vez al arrancar la app.
 */
export async function prepareNotifications(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL_ID, {
    name: 'Recordatorios',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function toPermissionState(response: Notifications.NotificationPermissionsStatus): PermissionState {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
  const response = await Notifications.getPermissionsAsync();
  return toPermissionState(response);
}

/**
 * Pide permiso solo si hace falta.
 * Devuelve el estado final para que la UI pueda explicar qué pasó.
 */
export async function ensurePermission(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';

  const response = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });

  return toPermissionState(response);
}

/**
 * Programa una notificación para un instante concreto.
 * Devuelve el identificador del sistema, necesario para cancelarla después.
 */
export async function scheduleAt(
  date: Date,
  content: NotificationContent,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body ?? undefined,
      sound: true,
      data: content.data ?? {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}

/** Programa una notificación dentro de N segundos. Se usa para la prueba manual. */
export async function scheduleInSeconds(
  seconds: number,
  content: NotificationContent,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body ?? undefined,
      sound: true,
      data: content.data ?? {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(seconds)),
      repeats: false,
      channelId: REMINDERS_CHANNEL_ID,
    },
  });
}

export async function cancel(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Cuántas notificaciones tiene el sistema pendientes. Útil en Configuración. */
export async function getScheduledCount(): Promise<number> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
}
