import { Text as RNText } from 'react-native';
import type { TextProps as RNTextProps } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;

type Tone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'disabled'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'onAccent';

const TONES: Record<Tone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  disabled: colors.textDisabled,
  accent: colors.accent,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  onAccent: colors.textOnAccent,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
  /** Color explícito. Tiene prioridad sobre `tone`. */
  color?: string;
  /** Aplica mayúsculas y espaciado de letra, para etiquetas pequeñas. */
  uppercase?: boolean;
}

/**
 * Único punto por el que pasa el texto de la app.
 *
 * Obliga a elegir entre los estilos definidos en el tema, que es lo que evita
 * que aparezcan quince tamaños de fuente distintos con el tiempo.
 */
export function Text({
  variant = 'body',
  tone = 'primary',
  color,
  uppercase = false,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: color ?? TONES[tone] },
        uppercase && { textTransform: 'uppercase', letterSpacing: 0.8 },
        style,
      ]}
    />
  );
}
