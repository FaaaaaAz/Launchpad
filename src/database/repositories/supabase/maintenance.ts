import { supabase } from '@/lib/supabase';

import { unwrapVoid } from './rows';

/**
 * Operaciones que afectan a todos los datos del usuario a la vez.
 *
 * Viven aparte de los repositorios de entidad porque no pertenecen a ninguna:
 * borrar «todo» no es borrar tareas nueve veces.
 */
export const supabaseMaintenanceRepository = {
  /**
   * Borra los datos del usuario en sesion, conservando la cuenta y el perfil.
   *
   * Se delega en la funcion `delete_my_data()` de Postgres en lugar de lanzar
   * nueve DELETE desde el telefono. Dos razones: es una sola transaccion --o
   * se borra todo o no se borra nada, sin dejar pagos huerfanos si se corta la
   * red a mitad-- y es un solo viaje de ida y vuelta.
   *
   * Ver `supabase/migrations/*_delete_my_data.sql`.
   */
  async deleteAllUserData(): Promise<void> {
    unwrapVoid(await supabase.rpc('delete_my_data'), 'borrar tus datos');
  },
};
