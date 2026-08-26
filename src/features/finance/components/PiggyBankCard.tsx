import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, View } from 'react-native';

import { Card, ProgressIndicator, Text } from '@/components/ui';
import { mascot } from '@/constants';
import { colors, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

import type { FinanceSummary } from '../financeSelectors';

export interface PiggyBankCardProps {
  summary: FinanceSummary;
  currency: string;
}

/**
 * Resumen de la alcancía: el bloque grande de la pantalla de finanzas.
 *
 * Responde primero a «¿con cuánto me quedo este mes?» y deja el detalle
 * (ingresos, gastos, deudas, ahorros) debajo.
 */
export function PiggyBankCard({ summary, currency }: PiggyBankCardProps) {
  const isPositive = summary.available >= 0;

  return (
    <Card flush>
      <LinearGradient
        colors={[`${colors.accent}1F`, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.headline}>
          <Text variant="caption" tone="muted" uppercase>
            Disponible este mes
          </Text>

          <Text
            variant="display"
            color={isPositive ? colors.textPrimary : colors.danger}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatCurrency(summary.available, currency)}
          </Text>

          <Text variant="caption" tone="muted">
            {isPositive
              ? 'Después de gastos, cuotas y ahorros'
              : 'Tus compromisos superan tus ingresos'}
          </Text>
        </View>

        <Image
          source={mascot.finance}
          style={styles.mascot}
          resizeMode="contain"
          accessible={false}
        />
      </View>

      {/* Todo lo que va bajo el encabezado comparte un contenedor con
          relleno propio: así el borde inferior de la card no depende de qué
          bloques opcionales estén visibles. */}
      <View style={styles.footer}>
        <View style={styles.grid}>
          <Metric
            label="Ingresos"
            value={formatCurrency(summary.income, currency)}
            color={colors.success}
          />
          <Metric
            label="Gastos"
            value={formatCurrency(summary.expense, currency)}
            color={colors.danger}
          />
          <Metric
            label="Cuotas"
            value={formatCurrency(summary.debtPayments, currency)}
            color={colors.warning}
          />
          <Metric
            label="Ahorro"
            value={formatCurrency(summary.savingContributions, currency)}
            color={colors.info}
          />
        </View>

        {summary.savingGoal > 0 ? (
          <View style={styles.goal}>
            <View style={styles.goalHeader}>
              <Text variant="caption" tone="secondary">
                Progreso de tus metas
              </Text>
              <Text variant="caption" tone="muted">
                {formatCurrency(summary.saved, currency)} de{' '}
                {formatCurrency(summary.savingGoal, currency)}
              </Text>
            </View>
            <ProgressIndicator
              value={summary.saved / summary.savingGoal}
              color={colors.info}
              label="Progreso de ahorro"
            />
          </View>
        ) : null}

        {summary.debtRemaining > 0 ? (
          <View style={styles.debtNote}>
            <Text variant="caption" tone="muted">
              Deuda pendiente
            </Text>
            <Text variant="bodyStrong" color={colors.warning}>
              {formatCurrency(summary.debtRemaining, currency)}
            </Text>
          </View>
        ) : null}
      </View>

    </Card>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricDot, { backgroundColor: color }]} />
      <View style={styles.metricText}>
        <Text variant="micro" tone="muted" uppercase>
          {label}
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    paddingTop: spacing.lg,
  },
  headline: {
    flex: 1,
    gap: spacing.xs,
  },
  mascot: {
    width: 118,
    height: 118,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  metric: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  metricText: {
    flex: 1,
    gap: 1,
  },
  goal: {
    gap: spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  debtNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
