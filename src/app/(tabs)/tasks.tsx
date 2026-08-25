import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ChipSelector } from '@/components/form';
import type { ChipOption } from '@/components/form';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
  Text,
} from '@/components/ui';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { useTasks } from '@/features/tasks/TasksProvider';
import {
  TASK_FILTERS,
  applyTaskFilter,
  summarizeTasks,
  type TaskFilterKey,
} from '@/features/tasks/taskSelectors';
import { useCategories } from '@/hooks/useCategories';
import { colors, spacing } from '@/theme';
import type { Task } from '@/types';
import { pluralize } from '@/utils/format';

const FILTER_OPTIONS: ChipOption<TaskFilterKey>[] = TASK_FILTERS.map((filter) => ({
  value: filter.key,
  label: filter.label,
}));

const EMPTY_COPY: Record<TaskFilterKey, { title: string; description: string }> = {
  today: {
    title: 'Nada para hoy',
    description: 'No tienes tareas con fecha de hoy ni pendientes atrasadas.',
  },
  pending: {
    title: 'Todo al día',
    description: 'No queda ninguna tarea pendiente. Buen trabajo.',
  },
  all: {
    title: 'Aún no hay tareas',
    description: 'Crea la primera y aparecerá aquí y en tu dashboard.',
  },
};

export default function TasksScreen() {
  const { tasks, isLoading, error, refresh, toggleTask } = useTasks();
  const { categories } = useCategories(null);
  const [filter, setFilter] = useState<TaskFilterKey>('pending');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const visibleTasks = useMemo(() => applyTaskFilter(tasks, filter), [tasks, filter]);
  const summary = useMemo(() => summarizeTasks(tasks), [tasks]);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const renderItem = ({ item }: { item: Task }) => {
    const category = item.categoryId ? categoriesById.get(item.categoryId) : undefined;

    return (
      <TaskCard
        task={item}
        categoryName={category?.name}
        categoryColor={category?.color}
        onToggle={() => void toggleTask(item)}
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
      />
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Tareas"
        subtitle={
          summary.pending > 0
            ? `${summary.pending} ${pluralize(summary.pending, 'pendiente', 'pendientes')}${
                summary.overdue > 0 ? ` · ${summary.overdue} atrasadas` : ''
              }`
            : 'Sin pendientes'
        }
        actionIcon="add"
        actionLabel="Nueva tarea"
        onActionPress={() => router.push('/task/new')}
      />

      <View style={styles.filters}>
        <ChipSelector
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(value) => setFilter(value ?? 'pending')}
          horizontal
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon="checkbox-outline"
          title={EMPTY_COPY[filter].title}
          description={EMPTY_COPY[filter].description}
          actionLabel="Nueva tarea"
          onActionPress={() => router.push('/task/new')}
        />
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text variant="caption" tone="muted" style={styles.count}>
              {visibleTasks.length}{' '}
              {pluralize(visibleTasks.length, 'tarea', 'tareas')}
            </Text>
          }
          ListFooterComponent={
            <Button
              label="Nueva tarea"
              onPress={() => router.push('/task/new')}
              variant="secondary"
              icon="add"
              fullWidth
              style={styles.footerButton}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={colors.textMuted}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  separator: {
    height: spacing.md,
  },
  count: {
    marginBottom: spacing.md,
  },
  footerButton: {
    marginTop: spacing.xl,
  },
});
