import type { PostgrestError } from '@supabase/supabase-js';

import type { ISODateTime, Weekday } from '@/types';
import { AppError } from '@/utils/errors';

/**
 * Traduccion entre lo que devuelve PostgREST y lo que espera el dominio.
 *
 * Los repositorios de Supabase pasan todos por aqui para que las conversiones
 * --y sobre todo los errores-- se resuelvan una sola vez y de la misma forma.
 * Es el equivalente de `database/sql.ts` para el lado remoto.
 */

/* -------------------------------------------------------------------------- */
/* Errores                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Mensajes por codigo de PostgreSQL / PostgREST.
 *
 * Un error de base de datos jamas debe llegar tal cual a la pantalla: al
 * usuario no le sirve leer «new row violates row-level security policy». Lo
 * que ve es una frase que le dice que hacer; el detalle tecnico va a consola.
 */
const MESSAGE_BY_CODE: Record<string, string> = {
  // PostgREST: `.single()` no encontro ninguna fila.
  PGRST116: 'Ese elemento ya no existe.',
  // Sin permiso. En la practica significa sesion caducada: RLS no encuentra
  // ninguna fila tuya porque el token ya no identifica a nadie.
  '42501': 'Tu sesión expiró. Vuelve a iniciar sesión.',
  // El token caduco mientras se usaba.
  PGRST301: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  /**
   * «JWT issued at future»: el reloj de PostgREST va por detras del de Auth y
   * el token le parece venido del futuro. `lib/supabase.ts` ya reintenta este
   * caso automaticamente; si el mensaje llega hasta aqui es que el desfase
   * duro mas que los reintentos, y entonces esperar es lo unico que sirve.
   */
  PGRST303: 'Hubo un desajuste de hora con el servidor. Espera unos segundos y vuelve a intentarlo.',
  '23505': 'Ya existe un elemento igual.',
  '23503': 'Ese elemento depende de otro que ya no existe.',
  '23514': 'Alguno de los datos no tiene un valor válido.',
  '23502': 'Falta un dato obligatorio.',
  '22P02': 'Alguno de los datos no tiene el formato esperado.',
};

/** Sin conexion. Es el error mas comun en un movil y merece su propio texto. */
const OFFLINE_MESSAGE = 'No pudimos conectarnos. Comprueba tu conexión.';

function isNetworkFailure(error: PostgrestError): boolean {
  const text = `${error.message} ${error.details ?? ''}`.toLowerCase();
  return (
    text.includes('network request failed') ||
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('timeout')
  );
}

/**
 * Convierte un error de PostgREST en un `AppError` presentable.
 *
 * `context` describe la operacion ('cargar las tareas') y solo se usa en el
 * mensaje generico, cuando el codigo no dice nada util.
 */
export function toAppError(error: PostgrestError, context: string): AppError {
  console.error(`[Launchpad] Supabase falló al ${context}:`, error);

  if (isNetworkFailure(error)) {
    return new AppError(OFFLINE_MESSAGE, 'network_error');
  }

  const known = error.code ? MESSAGE_BY_CODE[error.code] : undefined;
  if (known) return new AppError(known, error.code ?? 'postgrest_error');

  return new AppError(`No pudimos ${context}. Inténtalo de nuevo.`, 'postgrest_error');
}

/**
 * Respuesta de PostgREST tal y como la devuelve el cliente.
 *
 * `data` se declara anulable porque el tipo del cliente es la union de «salio
 * bien» y «fallo», y en la rama de fallo `data` es `null`. Al inferir `T` de
 * esa union, `T` incluye el `null`; por eso lo que devuelven los desempaque-
 * tadores va envuelto en `NonNullable`. Sin eso, cada repositorio tendria que
 * volver a comprobar un nulo que estas funciones ya descartaron.
 */
interface Response<T> {
  data: T | null;
  error: PostgrestError | null;
}

/** Desempaqueta una consulta que devuelve una lista. */
export function unwrapMany<T>(response: Response<T[]>, context: string): T[] {
  if (response.error) throw toAppError(response.error, context);
  return response.data ?? [];
}

/**
 * Desempaqueta una consulta que devuelve una fila obligatoria.
 * Se usa tras INSERT y UPDATE, donde no haber recibido nada es un fallo.
 */
export function unwrapOne<T>(response: Response<T>, context: string): NonNullable<T> {
  if (response.error) throw toAppError(response.error, context);
  if (response.data === null || response.data === undefined) {
    throw new AppError(`No pudimos ${context}. Inténtalo de nuevo.`, 'empty_response');
  }
  return response.data;
}

/**
 * Desempaqueta una busqueda donde «no existe» es una respuesta legitima.
 *
 * Se apoya en `.maybeSingle()`, que devuelve `null` en lugar de error cuando
 * no hay filas; el codigo PGRST116 se contempla igual por si la consulta usó
 * `.single()`.
 */
export function unwrapMaybe<T>(response: Response<T>, context: string): NonNullable<T> | null {
  if (response.error) {
    if (response.error.code === 'PGRST116') return null;
    throw toAppError(response.error, context);
  }
  return response.data ?? null;
}

/** Desempaqueta una operacion sin resultado (DELETE, RPC void). */
export function unwrapVoid(response: { error: PostgrestError | null }, context: string): void {
  if (response.error) throw toAppError(response.error, context);
}

/* -------------------------------------------------------------------------- */
/* Conversion de valores                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Normaliza un `timestamptz` al formato exacto que produce `nowISO()`.
 *
 * PostgREST devuelve '2026-08-27T15:00:00.123456+00:00'; el resto de la app
 * genera y compara '2026-08-27T15:00:00.123Z'. Sin este paso convivirian dos
 * formatos ISO distintos en el mismo campo segun quien lo hubiera escrito.
 */
export function toISO(value: string): ISODateTime {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export function toISOOrNull(value: string | null): ISODateTime | null {
  return value === null ? null : toISO(value);
}

/**
 * Fuerza a numero una columna `numeric`.
 *
 * PostgREST puede serializar `numeric` como cadena para no perder precision,
 * segun version y configuracion. Un `'150.00'` colandose donde la app espera
 * un numero convierte una suma en una concatenacion, asi que se convierte
 * siempre en lugar de confiar en el tipo declarado.
 */
export function toNumber(value: number | string | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toNumberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Valida los dias de la semana que llegan de un `smallint[]`.
 *
 * Se filtra en vez de confiar en el CHECK de la base por la misma razon que en
 * SQLite: una card sin dias es preferible a una pantalla que revienta.
 */
export function toWeekdays(value: number[] | null): Weekday[] {
  if (!value) return [];
  return value.filter(
    (day): day is Weekday => Number.isInteger(day) && day >= 0 && day <= 6,
  );
}

/**
 * Prepara los dias para enviarlos: sin repetidos y ordenados.
 * Igual que `serializeWeekdays()` en SQLite, pero como array nativo.
 */
export function fromWeekdays(days: Weekday[]): number[] {
  return [...new Set(days)].sort((a, b) => a - b);
}

/**
 * Comprueba que un texto guardado siga siendo un valor valido de la
 * enumeracion, cayendo a un valor por defecto si no.
 *
 * Protege de datos escritos por una version anterior de la app. Es la misma
 * funcion que `sql.asEnum()`, repetida aqui para que este modulo no dependa
 * del lado SQLite: las dos implementaciones deben poder separarse.
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
 * Quita del objeto las claves con `undefined`.
 *
 * Es la diferencia entre «no estoy actualizando este campo» (`undefined`) y
 * «lo estoy vaciando» (`null`), que es justo lo que necesita un formulario de
 * edicion parcial. Sin esto, PostgREST recibiria las claves ausentes como
 * ausentes de todos modos, pero el objeto enviado seria mas grande y el
 * comportamiento dependeria de como serializa JSON.stringify.
 */
export function defined<T extends Record<string, unknown>>(patch: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) result[key] = value;
  }
  return result as Partial<T>;
}
