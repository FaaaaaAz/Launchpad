import type { Migration } from './types';

/**
 * Alcancía: ingresos fijos, gastos fijos, deudas y ahorros.
 *
 * Una sola tabla para los cuatro tipos, discriminada por `kind`. Comparten
 * forma (nombre, monto mensual, día de vencimiento, control mensual) y separar
 * en cuatro tablas habría multiplicado repositorios y consultas sin ganar nada.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS finance_entries (
  id                 TEXT PRIMARY KEY NOT NULL,
  kind               TEXT NOT NULL,
  name               TEXT NOT NULL,
  amount             REAL NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'BOB',
  target_amount      REAL,
  settled_amount     REAL,
  due_day            INTEGER,
  last_settled_month TEXT,
  notes              TEXT,
  is_active          INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_kind ON finance_entries (kind, is_active);
`;

export const migration002: Migration = {
  version: 2,
  name: 'finance_entries',
  async up(db) {
    await db.execAsync(SCHEMA);
  },
};
