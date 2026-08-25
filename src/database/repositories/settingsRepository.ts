import { nowISO } from '@/utils/date';

import { getDatabase } from '../database';
import type { SettingsRepository } from './types';

interface SettingRow {
  key: string;
  value: string;
}

/**
 * Preferencias locales en una tabla clave/valor.
 *
 * Se usa SQLite en vez de AsyncStorage para no sumar otra dependencia ni otro
 * mecanismo de persistencia: toda la información local vive en un solo lugar,
 * lo que también simplifica el respaldo y la futura sincronización.
 */
export const sqliteSettingsRepository: SettingsRepository = {
  async getAll(): Promise<Record<string, string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<SettingRow>('SELECT key, value FROM settings');
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },

  async get(key: string): Promise<string | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<SettingRow>(
      'SELECT key, value FROM settings WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, nowISO()],
    );
  },

  async remove(key: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
  },
};
