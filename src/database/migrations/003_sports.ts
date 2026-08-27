import type { Migration } from './types';

/**
 * Deportes y calendario de las actividades.
 *
 * Añade el deporte a `activities` y crea la tabla de días anotados
 * (entrenamientos y competencias).
 *
 * `sport_key` se guarda como texto y no como valor restringido por CHECK: los
 * deportes se validan al leer, así que agregar uno nuevo no obliga a escribir
 * otra migración.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS activity_events (
  id          TEXT PRIMARY KEY NOT NULL,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'training',
  title       TEXT,
  notes       TEXT,
  completed   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_events ON activity_events (activity_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_events_date ON activity_events (date);
`;

export const migration003: Migration = {
  version: 3,
  name: 'sports_and_events',
  async up(db) {
    // SQLite no admite `ADD COLUMN IF NOT EXISTS`, así que se comprueba antes.
    const columns = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('activities')",
    );

    if (!columns.some((column) => column.name === 'sport_key')) {
      await db.execAsync('ALTER TABLE activities ADD COLUMN sport_key TEXT');
    }

    await db.execAsync(SCHEMA);
  },
};
