import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
  Text,
} from '@/components/ui';
import { getDomainConfig } from '@/constants';
import { useCategories } from '@/hooks/useCategories';
import { colors, spacing } from '@/theme';
import type { Activity, ActivityDomain } from '@/types';
import { pluralize } from '@/utils/format';

import { useActivities } from '../ActivitiesProvider';
import { ActivityCard } from './ActivityCard';

/**
 * Pantalla completa de un módulo de actividades.
 *
 * Ejercicio, Académico y Hobbies son la misma pantalla con distinta
 * configuración. Mantenerlas unificadas significa que cualquier mejora (un
 * filtro, un orden nuevo, una animación) llega a los tres módulos a la vez.
 */
export function ActivityDomainScreen({ domain }: { domain: ActivityDomain }) {
  const config = getDomainConfig(domain);
  const { activities, isLoading, error, refresh } = useActivities();
  const { categories } = useCategories(domain);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const items = useMemo(
    () => activities.filter((activity) => activity.domain === domain),
    [activities, domain],
  );

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const openNew = () => router.push({ pathname: '/activity/new', params: { domain } });

  const renderItem = ({ item }: { item: Activity }) => (
    <ActivityCard
      activity={item}
      categoryName={item.categoryId ? categoryNames.get(item.categoryId) : undefined}
      onPress={() => router.push({ pathname: '/activity/[id]', params: { id: item.id } })}
    />
  );

  return (
    <Screen>
      <ScreenHeader
        title={config.title}
        subtitle={config.tagline}
        accentColor={config.color}
        actionIcon="add"
        actionLabel={config.createLabel}
        onActionPress={openNew}
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={config.icon}
          title={config.emptyTitle}
          description={config.emptyDescription}
          actionLabel={config.createLabel}
          onActionPress={openNew}
          accentColor={config.color}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text variant="caption" tone="muted" style={styles.count}>
              {items.length} {pluralize(items.length, config.itemLabel, config.itemLabelPlural)}
            </Text>
          }
          ListFooterComponent={
            <Button
              label={config.createLabel}
              onPress={openNew}
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
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },
  separator: {
    height: spacing.lg,
  },
  count: {
    marginBottom: spacing.md,
  },
  footerButton: {
    marginTop: spacing.xl,
  },
});
