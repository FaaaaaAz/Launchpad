import type { SQLiteDatabase } from 'expo-sqlite';

import { migration001 } from './001_initial';
import { migration002 } from './002_finance';
import type { Migration } from './types';

export type { Migration, SQLiteExecutor } from './types';

/**
 * Lista de migraciones en orden. Agregar las nuevas al final.
 */
const MIGRATIONS: Migration[] = [migration001, migration002];

/** Versión de esquema que espera esta build de la app. */
export const TARGET_SCHEMA_VERSION = MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0,
);

/**
 * Aplica las migraciones pendientes usando `PRAGMA user_version` como marca.
 *
 * Cada migración corre dentro de su propia transacción exclusiva: si una falla,
 * revierte por completo y la versión no avanza, así que el próximo arranque
 * vuelve a intentarla desde un estado consistente.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((migration) => migration.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migration.up(txn);
    });

    // PRAGMA no acepta parámetros ligados; el valor viene de nuestro propio
    // código (nunca de entrada del usuario), así que interpolarlo es seguro.
    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    currentVersion = migration.version;

    if (__DEV__) {
      console.log(`[Launchpad] Migración aplicada: ${migration.version} ${migration.name}`);
    }
  }

  return currentVersion;
}
