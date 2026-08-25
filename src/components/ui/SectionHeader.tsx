import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '@/constants';
import { colors, spacing, HIT_SLOP } from '@/theme';

import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  /** Acción secundaria a la derecha ('Ver todas'). */
  actionLabel?: string;
  onActionPress?: () => void;
}

/** Encabezado de un bloque dentro de una pantalla. */
export function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor = colors.textMuted,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleGroup}>
        {icon ? <Ionicons name={icon} size={16} color={iconColor} /> : null}
        <View style={styles.texts}>
          <Text variant="heading">{title}</Text>
          {subtitle ? (
            <Text variant="caption" tone="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text variant="caption" tone="accent">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  texts: {
    flexShrink: 1,
    gap: 2,
  },
});
