import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
  SectionHeader,
  Text,
} from '@/components/ui';
import { FINANCE_KIND_ORDER, getFinanceKindConfig } from '@/constants';
import { FinanceEntryCard } from '@/features/finance/components/FinanceEntryCard';
import { PiggyBankCard } from '@/features/finance/components/PiggyBankCard';
import { useFinance } from '@/features/finance/FinanceProvider';
import { filterByKind } from '@/features/finance/financeSelectors';
import { useSettings } from '@/providers/SettingsProvider';
import { colors, spacing } from '@/theme';
import type { FinanceKind } from '@/types';

/**
 * La alcancía.
 *
 * No es una pestaña porque la barra ya tiene cinco destinos; se entra desde la
 * card de finanzas del dashboard.
 */
export default function FinanceScreen() {
  const { currency } = useSettings();
  const { entries, summary, isLoading, error, refresh, toggleMonth } = useFinance();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const openNew = (kind: FinanceKind) =>
    router.push({ pathname: '/finance/new', params: { kind } });

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Finanzas" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Finanzas" showBack />
        <ErrorState message={error} onRetry={() => void refresh()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Finanzas"
        subtitle="Tu alcancía: lo que entra, lo que sale y lo que guardas"
        showBack
        accentColor={colors.accent}
        actionIcon="add"
        actionLabel="Nuevo movimiento"
        onActionPress={() => openNew('expense')}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.textMuted}
          />
        }
      >
        <PiggyBankCard summary={summary} currency={currency} />

        {summary.activeCount === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="Tu alcancía está vacía"
            description="Empieza por tu sueldo y tus gastos fijos. Con eso ya sabrás con cuánto cuentas cada mes."
            actionLabel="Agregar ingreso"
            onActionPress={() => openNew('income')}
          />
        ) : null}

        {FINANCE_KIND_ORDER.map((kind) => {
          const config = getFinanceKindConfig(kind);
          const items = filterByKind(entries, kind);

          // Con la alcancía vacía ya se muestra un estado global; repetir
          // cuatro bloques vacíos solo haría ruido.
          if (items.length === 0 && summary.activeCount === 0) return null;

          return (
            <View key={kind}>
              <SectionHeader
                title={config.labelPlural}
                icon={config.icon}
                iconColor={config.color}
                actionLabel="Agregar"
                onActionPress={() => openNew(kind)}
              />

              {items.length === 0 ? (
                <Text variant="caption" tone="muted" style={styles.sectionEmpty}>
                  {config.emptyDescription}
                </Text>
              ) : (
                <View style={styles.stack}>
                  {items.map((entry) => (
                    <FinanceEntryCard
                      key={entry.id}
                      entry={entry}
                      onPress={() =>
                        router.push({ pathname: '/finance/[id]', params: { id: entry.id } })
                      }
                      onToggleMonth={() => void toggleMonth(entry)}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {summary.activeCount > 0 ? (
          <Button
            label="Nuevo movimiento"
            onPress={() => openNew('expense')}
            variant="secondary"
            icon="add"
            fullWidth
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.xxl,
  },
  stack: {
    gap: spacing.md,
  },
  sectionEmpty: {
    marginTop: -spacing.xs,
  },
});
