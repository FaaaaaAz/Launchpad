import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { IconName } from '@/constants';
import { colors, radius, spacing } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

/**
 * Los tres estados que toda pantalla con datos necesita: cargando, vacío y
 * error. Tenerlos aquí garantiza que se vean igual en toda la app y que
 * ninguna pantalla se olvide de manejarlos.
 */

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  /** Color del ícono. Por defecto el acento de la app. */
  accentColor?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onActionPress,
  accentColor = colors.accent,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: `${accentColor}1F` }]}>
        <Ionicons name={icon} size={26} color={accentColor} />
      </View>

      <Text variant="heading" style={styles.centered}>
        {title}
      </Text>

      {description ? (
        <Text variant="body" tone="muted" style={styles.centered}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onActionPress ? (
        <Button label={actionLabel} onPress={onActionPress} icon="add" style={styles.action} />
      ) : null}
    </View>
  );
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="alert-circle" size={26} color={colors.danger} />
      </View>

      <Text variant="heading" style={styles.centered}>
        Algo no salió bien
      </Text>

      <Text variant="body" tone="muted" style={styles.centered}>
        {message}
      </Text>

      {onRetry ? (
        <Button
          label="Reintentar"
          onPress={onRetry}
          variant="secondary"
          icon="refresh"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

/** Aviso en línea para errores dentro de un formulario. */
export function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.inline}>
      <Ionicons name="alert-circle" size={15} color={colors.danger} />
      <Text variant="caption" tone="danger" style={styles.inlineText}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.xs,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: spacing.md - 2,
  },
  inlineText: {
    flexShrink: 1,
  },
});
