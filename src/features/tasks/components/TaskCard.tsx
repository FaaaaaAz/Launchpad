import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { TASK_PRIORITY_META } from '@/constants';
import { colors, radius, spacing, HIT_SLOP } from '@/theme';
import type { Task } from '@/types';
import { formatRelativeDay } from '@/utils/date';

import { isOverdue } from '../taskSelectors';

export interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  /** Nombre de la categoría, ya resuelto por la pantalla. */
  categoryName?: string;
  categoryColor?: string;
}

/**
 * Fila de una tarea.
 *
 * El área de marcar como completada está separada del resto de la card para
 * que tocar el círculo complete y tocar el texto abra la edición, sin
 * ambigüedad.
 */
export function TaskCard({
  task,
  onToggle,
  onPress,
  categoryName,
  categoryColor,
}: TaskCardProps) {
  const isDone = task.status === 'completed';
  const priority = TASK_PRIORITY_META[task.priority];
  const overdue = isOverdue(task);

  return (
    <Card onPress={onPress} accessibilityLabel={task.title} style={styles.card}>
      <View style={styles.row}>
        <Pressable
          onPress={onToggle}
          hitSlop={HIT_SLOP}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone }}
          accessibilityLabel={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
          style={[
            styles.checkbox,
            isDone
              ? { backgroundColor: colors.success, borderColor: colors.success }
              : { borderColor: priority.color },
          ]}
        >
          {isDone ? <Ionicons name="checkmark" size={15} color={colors.background} /> : null}
        </Pressable>

        <View style={styles.body}>
          <Text
            variant="bodyStrong"
            tone={isDone ? 'muted' : 'primary'}
            numberOfLines={2}
            style={isDone ? styles.completedText : undefined}
          >
            {task.title}
          </Text>

          {task.description ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {task.description}
            </Text>
          ) : null}

          {!isDone ? (
            <View style={styles.meta}>
              {task.dueDate ? (
                <Badge
                  label={
                    task.dueTime
                      ? `${formatRelativeDay(task.dueDate)} · ${task.dueTime}`
                      : formatRelativeDay(task.dueDate)
                  }
                  icon={overdue ? 'alert-circle' : 'calendar-outline'}
                  color={overdue ? colors.danger : colors.textSecondary}
                  backgroundColor={overdue ? colors.dangerSoft : colors.neutralSoft}
                  size="small"
                />
              ) : null}

              {task.priority !== 'medium' ? (
                <Badge
                  label={priority.label}
                  icon={priority.icon}
                  color={priority.color}
                  backgroundColor={priority.softColor}
                  size="small"
                />
              ) : null}

              {categoryName ? (
                <Badge
                  label={categoryName}
                  color={categoryColor ?? colors.textSecondary}
                  backgroundColor={colors.neutralSoft}
                  size="small"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg - 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: spacing.xs + 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: 2,
  },
});
