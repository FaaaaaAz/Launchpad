import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, ProgressIndicator, Text } from '@/components/ui';
import { getFinanceKindConfig } from '@/constants';
import { colors, radius, spacing, HIT_SLOP } from '@/theme';
import type { FinanceEntry } from '@/types';
import { formatCurrency } from '@/utils/format';

import { isSettledThisMonth, progressFor, remainingFor } from '../financeService';

export interface FinanceEntryCardProps {
  entry: FinanceEntry;
  onPress: () => void;
  /** Marca o desmarca el mes en curso. */
  onToggleMonth: () => void;
}

/**
 * Fila de un movimiento de la alcancía.
 *
 * El círculo de la izquierda marca el mes como cubierto; tocar el resto abre
 * la edición. Separar las dos zonas evita el toque ambiguo.
 */
export function FinanceEntryCard({ entry, onPress, onToggleMonth }: FinanceEntryCardProps) {
  const config = getFinanceKindConfig(entry.kind);
  const settled = isSettledThisMonth(entry);
  const showProgress = config.hasGoal && entry.targetAmount !== null;

  return (
    <Card onPress={onPress} accessibilityLabel={entry.name} style={styles.card}>
      <View style={styles.row}>
        {entry.dueDay !== null ? (
          <Pressable
            onPress={onToggleMonth}
            hitSlop={HIT_SLOP}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: settled }}
            accessibilityLabel={
              settled ? 'Marcar como pendiente este mes' : 'Marcar como cubierto este mes'
            }
            style={[
              styles.check,
              settled
                ? { backgroundColor: config.color, borderColor: config.color }
                : { borderColor: colors.borderStrong },
            ]}
          >
            {settled ? (
              <Ionicons name="checkmark" size={14} color={colors.background} />
            ) : (
              <Text variant="micro" tone="muted">
                {entry.dueDay}
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={[styles.check, styles.checkPlaceholder]}>
            <Ionicons name={config.icon} size={14} color={config.color} />
          </View>
        )}

        <View style={styles.body}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {entry.name}
          </Text>

          <Text variant="caption" tone="muted" numberOfLines={1}>
            {showProgress
              ? `Faltan ${formatCurrency(remainingFor(entry), entry.currency)}`
              : entry.dueDay !== null
                ? `Cada día ${entry.dueDay}${settled ? ' · cubierto' : ''}`
                : 'Sin fecha fija'}
          </Text>
        </View>

        <View style={styles.amountBlock}>
          <Text variant="bodyStrong" color={config.color}>
            {formatCurrency(entry.amount, entry.currency)}
          </Text>
          {!entry.isActive ? (
            <Text variant="micro" tone="disabled">
              En pausa
            </Text>
          ) : null}
        </View>
      </View>

      {showProgress ? (
        <View style={styles.progress}>
          <ProgressIndicator value={progressFor(entry)} color={config.color} height={5} />
          <View style={styles.progressLabels}>
            <Text variant="micro" tone="muted">
              {formatCurrency(entry.settledAmount ?? 0, entry.currency)}
            </Text>
            <Text variant="micro" tone="muted">
              {formatCurrency(entry.targetAmount ?? 0, entry.currency)}
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg - 2,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPlaceholder: {
    borderColor: 'transparent',
    backgroundColor: colors.surfaceElevated,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  progress: {
    gap: spacing.xs,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
