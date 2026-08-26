import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';

export const DATABASE_NAME = 'launchpad.db';

let connection: SQLite.SQLiteDatabase | null = null;
let pendingOpen: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Devuelve la conexión única a SQLite, abriéndola y migrándola la primera vez.
 *
 * Se cachea la *promesa* además de la instancia para que varias llamadas
 * simultáneas durante el arranque compartan la misma apertura en lugar de
 * abrir la base y correr las migraciones dos veces.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (connection) return connection;

  if (!pendingOpen) {
    pendingOpen = openAndMigrate().catch((error: unknown) => {
      // Si falla, se limpia la promesa para que un reintento pueda volver a abrir.
      pendingOpen = null;
      throw error;
    });
  }

  return pendingOpen;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // WAL mejora la concurrencia lectura/escritura.
  // foreign_keys viene apagado por defecto en SQLite y hay que activarlo por conexión.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(db);

  connection = db;
  return db;
}

/** Cierra la conexión. Solo se usa en escenarios de mantenimiento. */
export async function closeDatabase(): Promise<void> {
  if (!connection) return;
  await connection.closeAsync();
  connection = null;
  pendingOpen = null;
}

/**
 * Borra todos los datos del usuario conservando el esquema y las categorías
 * del sistema. Lo usa la opción "Borrar todos los datos" de Configuración.
 */
export async function clearUserData(): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM finance_entries;
      DELETE FROM routine_items;
      DELETE FROM routines;
      DELETE FROM reminders;
      DELETE FROM payments;
      DELETE FROM tasks;
      DELETE FROM activities;
      DELETE FROM categories WHERE is_system = 0;
    `);
  });
}
