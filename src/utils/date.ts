import type { DateOnly, ISODateTime, TimeOfDay, Weekday } from '@/types';

/**
 * Utilidades de fecha.
 *
 * Convenciones:
 * - `DateOnly` ('2026-08-25') representa un día en la zona horaria del usuario.
 *   Se manipula como texto para evitar los saltos de día por UTC.
 * - `ISODateTime` representa un instante exacto y se guarda en UTC.
 *
 * Los nombres de meses y días están escritos a mano en lugar de usar `Intl`
 * porque el soporte de `Intl` en Hermes varía según plataforma y no queremos
 * que la app muestre fechas en inglés en algún dispositivo.
 */

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const WEEKDAY_LONG = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

/** Iniciales en convención española: D L M X J V S. */
const WEEKDAY_INITIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/** Días de la semana ordenados empezando por lunes, como se leen en la app. */
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

const MS_PER_DAY = 86400000;

export function weekdayInitial(day: Weekday): string {
  return WEEKDAY_INITIAL[day] ?? '?';
}

export function weekdayName(day: Weekday): string {
  return WEEKDAY_LONG[day] ?? '';
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/* -------------------------------------------------------------------------- */
/* Conversión                                                                 */
/* -------------------------------------------------------------------------- */

export function nowISO(): ISODateTime {
  return new Date().toISOString();
}

/** Convierte un Date a 'YYYY-MM-DD' usando la fecha local, no UTC. */
export function toDateOnly(date: Date): DateOnly {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Convierte un Date a 'HH:mm' local. */
export function toTimeOfDay(date: Date): TimeOfDay {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function today(): DateOnly {
  return toDateOnly(new Date());
}

/** Interpreta 'YYYY-MM-DD' como medianoche local. Devuelve null si es inválida. */
export function parseDateOnly(value: DateOnly | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseTimeOfDay(
  value: TimeOfDay | null | undefined,
): { hours: number; minutes: number } | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** Combina un día y una hora en un instante local. Sin hora usa `fallbackHour`. */
export function combine(
  date: DateOnly,
  time: TimeOfDay | null,
  fallbackHour = 9,
): Date | null {
  const base = parseDateOnly(date);
  if (!base) return null;
  const parsed = parseTimeOfDay(time);
  base.setHours(parsed?.hours ?? fallbackHour, parsed?.minutes ?? 0, 0, 0);
  return base;
}

/* -------------------------------------------------------------------------- */
/* Aritmética                                                                 */
/* -------------------------------------------------------------------------- */

export function addDays(date: DateOnly, days: number): DateOnly {
  const base = parseDateOnly(date);
  if (!base) return date;
  base.setDate(base.getDate() + days);
  return toDateOnly(base);
}

/**
 * Suma meses conservando el fin de mes.
 * Ej: 31 de enero + 1 mes = 28/29 de febrero, no el 3 de marzo.
 */
export function addMonths(date: DateOnly, months: number): DateOnly {
  const base = parseDateOnly(date);
  if (!base) return date;
  const day = base.getDate();
  base.setDate(1);
  base.setMonth(base.getMonth() + months);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(day, lastDay));
  return toDateOnly(base);
}

/** Días calendario entre `from` y `date`. Negativo significa que ya pasó. */
export function daysUntil(date: DateOnly, from: DateOnly = today()): number {
  const target = parseDateOnly(date);
  const origin = parseDateOnly(from);
  if (!target || !origin) return 0;
  return Math.round((target.getTime() - origin.getTime()) / MS_PER_DAY);
}

export function isPast(date: DateOnly): boolean {
  return daysUntil(date) < 0;
}

export function isToday(date: DateOnly): boolean {
  return date === today();
}

/** Comparador para ordenar por fecha. Los nulos van al final. */
export function compareDateOnly(a: DateOnly | null, b: DateOnly | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

/* -------------------------------------------------------------------------- */
/* Presentación                                                               */
/* -------------------------------------------------------------------------- */

/** '25 de agosto' — agrega el año solo si no es el actual. */
export function formatDateLong(date: DateOnly): string {
  const parsed = parseDateOnly(date);
  if (!parsed) return '';
  const month = MONTHS[parsed.getMonth()] ?? '';
  const suffix =
    parsed.getFullYear() === new Date().getFullYear() ? '' : ` ${parsed.getFullYear()}`;
  return `${parsed.getDate()} de ${month}${suffix}`;
}

/** '25 ago' — versión compacta para cards. */
export function formatDateShort(date: DateOnly): string {
  const parsed = parseDateOnly(date);
  if (!parsed) return '';
  return `${parsed.getDate()} ${MONTHS_SHORT[parsed.getMonth()] ?? ''}`;
}

/** 'lunes, 25 de agosto' — encabezado del dashboard. */
export function formatFullDate(date: Date = new Date()): string {
  const weekday = WEEKDAY_LONG[date.getDay()] ?? '';
  const month = MONTHS[date.getMonth()] ?? '';
  return `${weekday}, ${date.getDate()} de ${month}`;
}

/** 'Hoy', 'Mañana', 'Ayer', 'En 3 días' o la fecha corta. */
export function formatRelativeDay(date: DateOnly): string {
  const diff = daysUntil(date);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff <= 7) return `En ${diff} días`;
  if (diff < -1 && diff >= -7) return `Hace ${Math.abs(diff)} días`;
  return formatDateShort(date);
}

/** Convierte [1,2,3] en 'L M X'. */
export function formatWeekdays(days: Weekday[]): string {
  if (days.length === 0) return '';
  if (days.length === 7) return 'Todos los días';
  return WEEKDAYS.filter((day) => days.includes(day)).map(weekdayInitial).join(' ');
}

/** '18:30' o '18:30 – 20:00' si hay hora de fin. */
export function formatTimeRange(start: TimeOfDay | null, end: TimeOfDay | null): string {
  if (!start) return '';
  return end ? `${start} – ${end}` : start;
}

/** Saludo según la hora, usado en el dashboard. */
export function greetingForNow(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) return 'Buenas noches';
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
