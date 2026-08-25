import type { Weekday } from '@/types';

/** Valores que SQLite acepta como parámetro ligado. */
export type SqlValue = string | number | null;

export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

export function intToBool(value: number): boolean {
  return value === 1;
}

/** Los arrays se guardan como JSON en una columna TEXT. */
export function serializeWeekdays(days: Weekday[]): string {
  return JSON.stringify([...new Set(days)].sort((a, b) => a - b));
}

/**
 * Lee la columna JSON de días. Tolera datos corruptos devolviendo un array
 * vacío: una card sin días es preferible a una pantalla que revienta.
 */
export function parseWeekdays(raw: string | null): Weekday[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is Weekday =>
        typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6,
    );
  } catch {
    console.warn('[Launchpad] weekdays con formato inválido:', raw);
    return [];
  }
}

/**
 * Valida que un texto guardado siga siendo un valor válido de la enumeración.
 *
 * Protege contra datos escritos por una versión anterior de la app: si el valor
 * ya no existe, se cae a un valor por defecto en lugar de propagar basura
 * tipada como si fuera correcta.
 */
export function asEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return value !== null && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * Construye la parte `SET` de un UPDATE a partir de un mapa de columnas.
 *
 * Distingue `undefined` (el campo no se está actualizando) de `null`
 * (el campo se está limpiando), que es justo lo que necesita un formulario
 * de edición parcial.
 */
export function buildAssignments(columns: Record<string, SqlValue | undefined>): {
  clause: string;
  values: SqlValue[];
} {
  const entries = Object.entries(columns).filter(
    (entry): entry is [string, SqlValue] => entry[1] !== undefined,
  );

  return {
    clause: entries.map(([column]) => `${column} = ?`).join(', '),
    values: entries.map(([, value]) => value),
  };
}
