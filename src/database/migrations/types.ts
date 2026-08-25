import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Subconjunto de la API de SQLite que una migración necesita.
 *
 * Se tipa así (y no como `SQLiteDatabase`) porque las migraciones corren
 * dentro de una transacción, y el objeto de transacción solo garantiza estos
 * métodos.
 */
export type SQLiteExecutor = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

/**
 * Una migración es un cambio de esquema irreversible e inmutable.
 *
 * Reglas:
 * - Nunca editar una migración ya publicada: crear la siguiente.
 * - `version` debe ser consecutiva y única.
 */
export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteExecutor) => Promise<void>;
}
