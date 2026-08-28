import { clearLocalData, supabaseMaintenanceRepository } from '@/database';
import { cancelAll } from '@/services/notifications';

/**
 * Operaciones sobre los datos de la cuenta en conjunto.
 *
 * Existen aquí y no dentro de la pantalla de Configuración porque coordinan
 * varias cosas —el teléfono y la nube— y esa coordinación es una regla de
 * negocio, no una decisión de interfaz.
 */

/**
 * Deja la cuenta como recién creada.
 *
 * El orden importa: primero se cancelan las notificaciones del sistema y
 * después se borran las filas. Al revés, entre una cosa y otra seguirían
 * sonando avisos de tareas y pagos que ya no existen, y sin la fila ya no
 * quedaría forma de saber qué notificación cancelar.
 *
 * No borra la cuenta ni el perfil: borrar los datos y darse de baja son cosas
 * distintas y deben pedirse por separado.
 */
export async function deleteAllUserData(): Promise<void> {
  await cancelAll();
  await supabaseMaintenanceRepository.deleteAllUserData();
}

/**
 * Borra la copia que quedó en el teléfono de la época sin cuentas.
 *
 * Solo tiene sentido después de que la importación haya terminado bien: hasta
 * entonces, esa copia es el único sitio donde viven esos datos. Por eso es una
 * acción explícita del usuario y no un paso automático de la importación.
 */
export async function deleteLegacyLocalData(): Promise<void> {
  await clearLocalData();
}
