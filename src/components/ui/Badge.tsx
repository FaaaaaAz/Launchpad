import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@/constants';
import { colors, radius, spacing } from '@/theme';

import { Text } from './Text';

export interface BadgeProps {
  label: string;
  /** Color del texto y del ícono. */
  color?: string;
  /** Fondo tenue. Si no se indica, se usa un gris neutro. */
  backgroundColor?: string;
  icon?: IconName;
  size?: 'small' | 'medium';
}

/** Etiqueta compacta de estado: 'Pagada', 'Alta', 'Vence en 2 días'. */
export function Badge({
  label,
  color = colors.textSecondary,
  backgroundColor = colors.neutralSoft,
  icon,
  size = 'medium',
}: BadgeProps) {
  const iconSize = size === 'small' ? 11 : 13;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor },
        size === 'small' ? styles.small : styles.medium,
      ]}
    >
      {icon ? <Ionicons name={icon} size={iconSize} color={color} /> : null}
      <Text variant={size === 'small' ? 'micro' : 'caption'} color={color} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  small: {
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  medium: {
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md - 2,
  },
});
