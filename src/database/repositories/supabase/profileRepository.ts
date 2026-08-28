import type { ProfileRow } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import type { ID, Profile } from '@/types';

import { defined, toISO, unwrapMaybe, unwrapOne } from './rows';

/**
 * Perfil del usuario.
 *
 * Queda fuera de `RepositoryRegistry` a proposito: el registro describe los
 * datos que pueden vivir tanto en el telefono como en la nube, y el perfil solo
 * existe si hay cuenta. Meterlo alli obligaria a inventar una implementacion
 * local que nunca tendria nada que devolver.
 */

/** Campos que el usuario puede editar. El `id` nunca cambia. */
export interface ProfilePatch {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

function toDomain(row: ProfileRow): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: toISO(row.created_at),
    updatedAt: toISO(row.updated_at),
  };
}

export const supabaseProfileRepository = {
  /**
   * Devuelve `null` si el perfil todavia no existe.
   *
   * Puede pasar en dos casos reales: una cuenta creada antes de que existiera
   * el trigger `handle_new_user`, o el instante justo despues del registro si
   * la lectura se adelanta a la escritura del trigger. Quien llama decide que
   * hacer; `upsert()` de aqui abajo lo repara.
   */
  async find(id: ID): Promise<Profile | null> {
    const row = unwrapMaybe(
      await supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      'cargar tu perfil',
    );
    return row ? toDomain(row) : null;
  },

  /**
   * Crea o actualiza el perfil.
   *
   * Es `upsert` y no `update` porque el perfil normalmente ya existe (lo crea
   * el trigger de alta) pero no hay garantia de ello, y una pantalla de "editar
   * perfil" que falla porque la fila no existe seria un callejon sin salida.
   */
  async upsert(id: ID, patch: ProfilePatch): Promise<Profile> {
    const row = unwrapOne(
      await supabase
        .from('profiles')
        .upsert(
          {
            id,
            ...defined({
              first_name: patch.firstName,
              last_name: patch.lastName,
              display_name: patch.displayName,
              avatar_url: patch.avatarUrl,
            }),
          },
          { onConflict: 'id' },
        )
        .select('*')
        .single(),
      'guardar tu perfil',
    );
    return toDomain(row);
  },
};
