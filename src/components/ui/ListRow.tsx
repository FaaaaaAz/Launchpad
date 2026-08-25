import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import type { IconName } from '@/constants';
import { colors, radius, spacing } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  /** Texto alineado a la derecha (una fecha, un monto). */
  trailingText?: string;
  trailingColor?: string;
  /** Contenido libre a la derecha, por ejemplo un Badge. */
  trailing?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

/**
 * Fila compacta de lista.
 *
 * Es el ladrillo del dashboard y de Configuración: mismo alto, mismo
 * espaciado y misma zona táctil en todos lados.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  iconColor = colors.textMuted,
  trailingText,
  trailingColor,
  trailing,
  onPress,
  showChevron = false,
}: ListRowProps) {
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: `${iconColor}1F` }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
      ) : null}

      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ??
        (trailingText ? (
          <Text variant="caption" color={trailingColor ?? colors.textMuted}>
            {trailingText}
          </Text>
        ) : null)}

      {showChevron ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      activeScale={0.985}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 1,
  },
});
