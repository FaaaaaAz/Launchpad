import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { spacing } from '@/theme';

import { Text } from '../ui/Text';

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

/** Agrupa campos relacionados dentro de un formulario largo. */
export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.header}>
          <Text variant="caption" tone="muted" uppercase>
            {title}
          </Text>
          {description ? (
            <Text variant="caption" tone="muted">
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.fields}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.lg,
  },
  header: {
    gap: 2,
  },
  fields: {
    gap: spacing.lg,
  },
});
