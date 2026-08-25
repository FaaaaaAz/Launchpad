import type { Migration } from './types';

/**
 * Esquema inicial de Launchpad.
 *
 * Nota sobre los valores literales: una migración es un registro histórico y
 * debe producir siempre el mismo resultado. Por eso los colores y las fechas
 * de las categorías sembradas están escritos a mano y no importados del tema:
 * si mañana cambia la paleta, esta migración debe seguir generando lo mismo
 * que generó el día que se ejecutó por primera vez.
 */

const SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';

interface SeedCategory {
  id: string;
  name: string;
  domain: string | null;
  color: string;
  icon: string;
}

const SEED_CATEGORIES: SeedCategory[] = [
  // Ejercicio
  { id: 'cat-ex-gym', name: 'Gimnasio', domain: 'exercise', color: '#FB7A45', icon: 'barbell' },
  { id: 'cat-ex-box', name: 'Boxeo', domain: 'exercise', color: '#F87171', icon: 'hand-left' },
  { id: 'cat-ex-run', name: 'Running', domain: 'exercise', color: '#34D399', icon: 'walk' },
  { id: 'cat-ex-sport', name: 'Deporte', domain: 'exercise', color: '#60A5FA', icon: 'football' },

  // Académico
  { id: 'cat-ac-uni', name: 'Universidad', domain: 'academic', color: '#60A5FA', icon: 'school' },
  { id: 'cat-ac-subject', name: 'Materia', domain: 'academic', color: '#8B78FF', icon: 'book' },
  { id: 'cat-ac-project', name: 'Proyecto', domain: 'academic', color: '#34D399', icon: 'construct' },
  { id: 'cat-ac-course', name: 'Curso', domain: 'academic', color: '#FBBF24', icon: 'ribbon' },

  // Hobbies
  { id: 'cat-hb-photo', name: 'Fotografía', domain: 'hobby', color: '#C084FC', icon: 'camera' },
  { id: 'cat-hb-games', name: 'Videojuegos', domain: 'hobby', color: '#60A5FA', icon: 'game-controller' },
  { id: 'cat-hb-reading', name: 'Lectura', domain: 'hobby', color: '#FBBF24', icon: 'book' },
  { id: 'cat-hb-music', name: 'Música', domain: 'hobby', color: '#F87171', icon: 'musical-notes' },
  { id: 'cat-hb-code', name: 'Programación', domain: 'hobby', color: '#34D399', icon: 'code-slash' },

  // Tareas (domain null)
  { id: 'cat-tk-personal', name: 'Personal', domain: null, color: '#8B78FF', icon: 'person' },
  { id: 'cat-tk-study', name: 'Estudio', domain: null, color: '#60A5FA', icon: 'school' },
  { id: 'cat-tk-health', name: 'Salud', domain: null, color: '#34D399', icon: 'heart' },
  { id: 'cat-tk-money', name: 'Finanzas', domain: null, color: '#FBBF24', icon: 'cash' },
  { id: 'cat-tk-home', name: 'Casa', domain: null, color: '#FB7A45', icon: 'home' },
];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY NOT NULL,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  domain     TEXT,
  color      TEXT NOT NULL,
  icon       TEXT,
  is_system  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id                TEXT PRIMARY KEY NOT NULL,
  domain            TEXT NOT NULL,
  name              TEXT NOT NULL,
  subtitle          TEXT,
  category_id       TEXT REFERENCES categories(id) ON DELETE SET NULL,
  image_key         TEXT,
  location          TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  weekdays          TEXT NOT NULL DEFAULT '[]',
  start_time        TEXT,
  end_time          TEXT,
  start_date        TEXT,
  end_date          TEXT,
  notes             TEXT,
  billing_cycle     TEXT NOT NULL DEFAULT 'none',
  billing_amount    REAL,
  currency          TEXT NOT NULL DEFAULT 'BOB',
  last_payment_date TEXT,
  next_payment_date TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_domain ON activities (domain, status);
CREATE INDEX IF NOT EXISTS idx_activities_next_payment ON activities (next_payment_date);

CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY NOT NULL,
  activity_id  TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  amount       REAL NOT NULL,
  currency     TEXT NOT NULL,
  paid_at      TEXT NOT NULL,
  covers_until TEXT,
  notes        TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_activity ON payments (activity_id, paid_at DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  priority     TEXT NOT NULL DEFAULT 'medium',
  due_date     TEXT,
  due_time     TEXT,
  category_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
  activity_id  TEXT REFERENCES activities(id) ON DELETE SET NULL,
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status, due_date);

CREATE TABLE IF NOT EXISTS reminders (
  id              TEXT PRIMARY KEY NOT NULL,
  target_type     TEXT NOT NULL,
  target_id       TEXT,
  title           TEXT NOT NULL,
  body            TEXT,
  scheduled_at    TEXT NOT NULL,
  repeat_rule     TEXT NOT NULL DEFAULT 'none',
  notification_id TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_target ON reminders (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders (status, scheduled_at);

CREATE TABLE IF NOT EXISTS routines (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  domain     TEXT,
  weekdays   TEXT NOT NULL DEFAULT '[]',
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_items (
  id               TEXT PRIMARY KEY NOT NULL,
  routine_id       TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  time             TEXT,
  duration_minutes INTEGER,
  position         INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_routine_items_routine ON routine_items (routine_id, position);
`;

export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',
  async up(db) {
    await db.execAsync(SCHEMA);

    for (const category of SEED_CATEGORIES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories
           (id, name, domain, color, icon, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        category.id,
        category.name,
        category.domain,
        category.color,
        category.icon,
        SEED_TIMESTAMP,
        SEED_TIMESTAMP,
      );
    }
  },
};
