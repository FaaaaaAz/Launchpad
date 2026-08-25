import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { Button } from './ui/Button';
import { Text } from './ui/Text';

export interface BootScreenProps {
  /** Si hay error, se muestra en lugar del indicador de carga. */
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Pantalla que se ve mientras la base de datos se abre y migra.
 *
 * Es el primer fotograma de la app, así que ya lleva la identidad visual:
 * pasar de aquí al dashboard no debe sentirse como un cambio de aplicación.
 */
export function BootScreen({ error, onRetry }: BootScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text variant="display" style={styles.wordmark}>
          LAUNCHPAD
        </Text>
        <Text variant="caption" tone="muted">
          Tu plataforma de lanzamiento
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBlock}>
          <Text variant="body" tone="danger" style={styles.errorText}>
            {error}
          </Text>
          {onRetry ? (
            <Button label="Reintentar" onPress={onRetry} variant="secondary" icon="refresh" />
          ) : null}
        </View>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.huge,
    padding: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  wordmark: {
    letterSpacing: 4,
  },
  errorBlock: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  errorText: {
    textAlign: 'center',
  },
});
