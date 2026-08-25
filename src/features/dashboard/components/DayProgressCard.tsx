import { StyleSheet, View } from 'react-native';

import { Card, ProgressIndicator, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { pluralize } from '@/utils/format';

export interface DayProgressCardProps {
  /** Tareas del día ya completadas. */
  completed: number;
  /** Total de tareas del día. */
  total: number;
  overdue: number;
}

/**
 * Resumen del día en una sola card.
 *
 * Es lo primero que se ve al abrir la app, así que responde a una única
 * pregunta: ¿cómo voy hoy?
 */
export function DayProgressCard({ completed, total, overdue }: DayProgressCardProps) {
  const progress = total === 0 ? 0 : completed / total;
  const remaining = Math.max(0, total - completed);

  const headline =
    total === 0
      ? 'Nada pendiente para hoy'
      : remaining === 0
        ? '¡Día completado!'
        : `${remaining} ${pluralize(remaining, 'tarea', 'tareas')} por delante`;

  const detail =
    total === 0
      ? 'Aprovecha para adelantar algo o descansar.'
      : `${completed} de ${total} ${pluralize(total, 'completada', 'completadas')}`;

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text variant="caption" tone="muted" uppercase>
            Progreso del día
          </Text>
          <Text variant="title">{headline}</Text>
        </View>

        <Text variant="title" tone={remaining === 0 && total > 0 ? 'success' : 'accent'}>
          {Math.round(progress * 100)}%
        </Text>
      </View>

      <ProgressIndicator
        value={progress}
        color={remaining === 0 && total > 0 ? colors.success : colors.accent}
        label="Progreso del día"
      />

      <View style={styles.footer}>
        <Text variant="caption" tone="muted">
          {detail}
        </Text>

        {overdue > 0 ? (
          <Text variant="caption" tone="danger">
            {overdue} {pluralize(overdue, 'atrasada', 'atrasadas')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
