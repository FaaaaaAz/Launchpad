import * as Crypto from 'expo-crypto';

/**
 * Genera el identificador de una entidad nueva.
 *
 * Se usa UUID en lugar de un autoincremental de SQLite para que los registros
 * puedan sincronizarse con una base remota sin colisiones ni remapeo de IDs.
 */
export function createId(): string {
  return Crypto.randomUUID();
}
