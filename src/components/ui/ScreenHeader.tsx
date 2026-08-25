import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@/constants';
import { colors, spacing } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Muestra el control para volver. */
  showBack?: boolean;
  /** Ícono del control de volver. En pantallas modales encaja mejor una X. */
  backIcon?: IconName;
  /** Acción de la esquina derecha. */
  actionIcon?: IconName;
  actionLabel?: string;
  onActionPress?: () => void;
  /** Color de acento del módulo, usado en el título. */
  accentColor?: string;
}

/**
 * Encabezado de pantalla con título grande.
 *
 * Se usa en lugar del header nativo de la navegación para poder controlar por
 * completo la tipografía y el espaciado, que es de donde sale buena parte de
 * la sensación de app cuidada.
 */
export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  backIcon = 'chevron-back',
  actionIcon,
  actionLabel,
  onActionPress,
  accentColor,
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {showBack ? (
          <IconButton
            icon={backIcon}
            accessibilityLabel="Volver"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
            size={38}
          />
        ) : null}

        <View style={styles.titleGroup}>
          <Text variant="display" color={accentColor} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {actionIcon && onActionPress ? (
          <IconButton
            icon={actionIcon}
            accessibilityLabel={actionLabel ?? 'Acción'}
            onPress={onActionPress}
            color={accentColor ?? colors.textSecondary}
            size={38}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
});
