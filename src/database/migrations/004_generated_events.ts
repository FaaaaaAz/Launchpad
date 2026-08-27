import type { Migration } from './types';

/**
 * Distingue los días que genera la app de los que anota el usuario.
 *
 * Hace falta para poder rehacer los entrenamientos automáticos cuando cambia
 * el horario de la actividad sin borrar de paso los partidos y los días extra
 * que el usuario añadió a mano.
 */
export const migration004: Migration = {
  version: 4,
  name: 'generated_events',
  async up(db) {
    const columns = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('activity_events')",
    );

    if (!columns.some((column) => column.name === 'is_generated')) {
      await db.execAsync(
        'ALTER TABLE activity_events ADD COLUMN is_generated INTEGER NOT NULL DEFAULT 0',
      );
    }
  },
};
