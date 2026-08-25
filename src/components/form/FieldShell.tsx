import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { spacing } from '@/theme';

import { Text } from '../ui/Text';

export interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Estructura común de un campo de formulario: etiqueta, contenido, ayuda y
 * error. Todos los campos la comparten para que la separación vertical y la
 * forma de mostrar errores sean idénticas en toda la app.
 */
export function FieldShell({ label, hint, error, required, children }: FieldShellProps) {
  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text variant="caption" tone="secondary">
            {label}
          </Text>
          {required ? (
            <Text variant="caption" tone="accent">
              *
            </Text>
          ) : null}
        </View>
      ) : null}

      {children}

      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
