import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

/** Escala de espaciado de 4pt. Usar siempre estos valores, no números sueltos. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Tipografía basada en la fuente del sistema (San Francisco en iOS),
 * que es lo que hace que una app se sienta nativa y no "web".
 */
export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

/** Sombras sutiles. En dark mode la elevación se percibe más por color que por sombra. */
export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 4 },
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.45,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    default: { elevation: 8 },
  }),
} as const;

/** Duraciones de animación. Sutil = corto. */
export const motion = {
  fast: 140,
  base: 220,
  slow: 320,
} as const;

/** Altura mínima táctil recomendada por las HIG de Apple. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH_SIZE = 44;
