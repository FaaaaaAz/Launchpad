import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { colors, radius, shadows, spacing } from '@/theme';

import { PressableScale } from './PressableScale';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Sin relleno interno, para cards que empiezan con una imagen a sangre. */
  flush?: boolean;
  /** Franja de color a la izquierda, para señalar dominio o estado. */
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Contenedor base de toda la app.
 *
 * Si recibe `onPress` se comporta como un elemento táctil; si no, es un simple
 * contenedor. Tener una sola Card evita que cada pantalla invente su propio
 * radio, borde y sombra.
 */
export function Card({
  children,
  onPress,
  flush = false,
  accentColor,
  style,
  accessibilityLabel,
}: CardProps) {
  const content = (
    <>
      {accentColor ? (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      ) : null}
      {children}
    </>
  );

  const cardStyle = [styles.card, flush ? styles.flush : styles.padded, style];

  if (!onPress) {
    return <View style={cardStyle}>{content}</View>;
  }

  return (
    <PressableScale
      style={cardStyle}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
  flush: {
    padding: 0,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
