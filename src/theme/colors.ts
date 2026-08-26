/**
 * Paleta de Launchpad: negro y amarillo.
 *
 * Los dos colores de marca están tomados píxel a píxel de los assets, no
 * elegidos a ojo:
 * - `#FDC305` es el amarillo del zorro en `assets/images/logo.png`.
 * - `#FD731D` es el naranja del pelaje de la mascota, y sirve de cierre
 *   natural para los degradados.
 *
 * Todos los colores de la app salen de aquí. Ninguna pantalla debe declarar un
 * color literal: si hace falta un tono nuevo, se agrega a esta paleta.
 */

const palette = {
  // Negros. `black950` es prácticamente el fondo del logo (#030303).
  black950: '#050506',
  black900: '#0B0B0D',
  black800: '#131316',
  black700: '#1B1B1F',
  black600: '#26262C',
  black500: '#34343C',

  // Amarillo de marca y su rango.
  yellow300: '#FFE18A',
  yellow400: '#FFD344',
  yellow500: '#FDC305',
  yellow600: '#D9A404',

  // Naranja de la mascota. Solo para degradados y acentos cálidos.
  orange500: '#FD731D',

  white: '#FFFFFF',
  gray100: '#F4F4F6',
  gray300: '#B4B4BE',
  gray400: '#8A8A95',
  gray500: '#61616B',

  // Colores funcionales. Se conservan tal cual: comunican significado
  // (urgencia, dinero, estado) y cambiarlos por identidad visual haría la
  // información más difícil de leer, que es justo lo contrario de lo que
  // buscamos.
  green500: '#34D399',
  amber500: '#FBBF24',
  red500: '#F87171',
  blue500: '#60A5FA',
} as const;

export const colors = {
  /** Fondo general de la aplicación. */
  background: palette.black950,
  /** Superficie de cards y contenedores. */
  surface: palette.black800,
  /** Superficie destacada (card sobre card, inputs). */
  surfaceElevated: palette.black700,
  /** Estado presionado / seleccionado. */
  surfacePressed: palette.black600,

  border: palette.black600,
  borderStrong: palette.black500,

  textPrimary: palette.gray100,
  textSecondary: palette.gray300,
  textMuted: palette.gray400,
  textDisabled: palette.gray500,
  /** Texto sobre amarillo: negro, nunca blanco. */
  textOnAccent: palette.black950,

  accent: palette.yellow500,
  accentLight: palette.yellow400,
  accentDeep: palette.yellow600,
  accentWarm: palette.orange500,
  accentSoft: 'rgba(253, 195, 5, 0.16)',
  accentBorder: 'rgba(253, 195, 5, 0.45)',
  accentPressed: palette.yellow400,

  success: palette.green500,
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warning: palette.amber500,
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  danger: palette.red500,
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
  info: palette.blue500,
  infoSoft: 'rgba(96, 165, 250, 0.14)',

  neutralSoft: 'rgba(180, 180, 190, 0.12)',

  overlay: 'rgba(5, 5, 6, 0.72)',
  /** Velo de la bienvenida: más denso, para apagar el dashboard detrás. */
  overlayDeep: 'rgba(5, 5, 6, 0.88)',
  skeleton: palette.black700,
} as const;

/**
 * Degradados de marca.
 *
 * Se declaran como tuplas de color listas para `expo-linear-gradient`, de modo
 * que ninguna pantalla invente su propia combinación.
 */
export const gradients = {
  /** Amarillo → naranja. El degradado principal de la marca. */
  brand: [palette.yellow400, palette.yellow500, palette.orange500],
  /** Amarillo suave, para superficies grandes que no deben gritar. */
  accent: [palette.yellow400, palette.yellow600],
  /** Realce sutil sobre superficies oscuras. */
  surface: [palette.black700, palette.black800],
} as const;

/**
 * Color de acento de cada módulo.
 *
 * Los tres comparten el amarillo de marca a propósito: tonos distintos por
 * módulo hacían que la app pareciera cambiar de identidad al moverse entre
 * pestañas. Los módulos se distinguen por su ícono y su ilustración, no por
 * el color.
 *
 * La estructura se conserva por si algún módulo futuro necesitara realmente
 * separarse del resto.
 */
export const domainColors = {
  exercise: palette.yellow500,
  academic: palette.yellow500,
  hobby: palette.yellow500,
} as const;

export type AppColor = keyof typeof colors;
