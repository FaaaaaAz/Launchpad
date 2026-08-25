/**
 * Tipos primitivos compartidos.
 *
 * Decisión importante: todas las fechas se guardan como texto ISO en UTC y
 * los IDs son UUID (string), no enteros autoincrementales. Esto permite mover
 * los datos a Firestore más adelante sin reasignar IDs ni reescribir relaciones.
 */

/** Instante completo en ISO-8601 UTC. Ej: '2026-08-25T14:30:00.000Z' */
export type ISODateTime = string;

/** Fecha sin hora, en horario local del usuario. Ej: '2026-08-25' */
export type DateOnly = string;

/** Hora del día en formato 24h. Ej: '18:30' */
export type TimeOfDay = string;

/** Identificador único (UUID v4). */
export type ID = string;

/** 0 = domingo ... 6 = sábado (coincide con Date.prototype.getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Campos de auditoría presentes en toda entidad persistida. */
export interface Timestamped {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Entidad base: identificador + auditoría. */
export interface Entity extends Timestamped {
  id: ID;
}

/**
 * Datos que envía un formulario para crear una entidad:
 * sin id ni timestamps, que los genera la capa de datos.
 */
export type CreateInput<T extends Entity> = Omit<T, keyof Entity>;

/** Actualización parcial de una entidad. */
export type UpdateInput<T extends Entity> = Partial<CreateInput<T>>;
