/**
 * Paleta base de Launchpad.
 *
 * Todos los colores de la app salen de aquí. Ninguna pantalla debe declarar
 * un color literal: si hace falta un tono nuevo, se agrega a esta paleta.
 *
 * La v1 es dark-only por decisión de producto (un centro de control personal
 * se lee mejor en oscuro). La estructura ya está preparada para agregar un
 * tema claro más adelante: bastaría con exportar otro objeto `colors` y
 * seleccionarlo desde un ThemeProvider.
 */

const palette = {
  night900: '#0B0E14',
  night800: '#111621',
  night700: '#161D2A',
  night600: '#1D2634',
  night500: '#26303F',

  white: '#FFFFFF',
  cloud100: '#F2F5FA',
  slate300: '#9AA6BC',
  slate400: '#6E7C94',
  slate500: '#4E5B70',

  violet500: '#6E56F8',
  violet400: '#8B78FF',

  green500: '#34D399',
  amber500: '#FBBF24',
  red500: '#F87171',
  blue500: '#60A5FA',
  orange500: '#FB7A45',
  purple500: '#C084FC',
} as const;

export const colors = {
  /** Fondo general de la aplicación. */
  background: palette.night900,
  /** Superficie de cards y contenedores. */
  surface: palette.night800,
  /** Superficie destacada (card sobre card, inputs). */
  surfaceElevated: palette.night700,
  /** Estado presionado / seleccionado. */
  surfacePressed: palette.night600,

  border: palette.night600,
  borderStrong: palette.night500,

  textPrimary: palette.cloud100,
  textSecondary: palette.slate300,
  textMuted: palette.slate400,
  textDisabled: palette.slate500,
  textOnAccent: palette.white,

  accent: palette.violet500,
  accentSoft: 'rgba(110, 86, 248, 0.16)',
  accentBorder: 'rgba(110, 86, 248, 0.42)',
  accentPressed: palette.violet400,

  success: palette.green500,
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warning: palette.amber500,
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  danger: palette.red500,
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  info: palette.blue500,
  infoSoft: 'rgba(96, 165, 250, 0.14)',

  neutralSoft: 'rgba(154, 166, 188, 0.12)',

  overlay: 'rgba(5, 7, 11, 0.72)',
  skeleton: palette.night700,
} as const;

/**
 * Color identitario de cada dominio de actividad.
 * Se usa en tabs, headers y acentos de card para que cada módulo
 * se reconozca de un vistazo.
 */
export const domainColors = {
  exercise: palette.orange500,
  academic: palette.blue500,
  hobby: palette.purple500,
} as const;

export type AppColor = keyof typeof colors;
