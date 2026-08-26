import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { mascot } from '@/constants';
import { colors, radius, shadows, spacing } from '@/theme';
import { formatCurrency, pluralize } from '@/utils/format';

import type { FinanceSummary } from '@/features/finance/financeSelectors';

export interface FinanceCardProps {
  summary: FinanceSummary;
  currency: string;
}

const CARD_HEIGHT = 132;

/**
 * Acceso a la alcancía desde el dashboard.
 *
 * Muestra el único número que importa de un vistazo —cuánto queda libre este
 * mes— y avisa si hay pagos sin marcar. El detalle vive en `/finance`.
 */
export function FinanceCard({ summary, currency }: FinanceCardProps) {
  const isEmpty = summary.activeCount === 0;
  const isPositive = summary.available >= 0;

  return (
    <PressableScale
      onPress={() => router.push('/finance')}
      accessibilityRole="button"
      accessibilityLabel="Abrir tus finanzas"
      style={styles.card}
    >
      <LinearGradient
        colors={['transparent', `${colors.accent}1F`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.body}>
        <Text variant="micro" tone="muted" uppercase>
          Mi alcancía
        </Text>

        {isEmpty ? (
          <>
            <Text variant="title" numberOfLines={1}>
              Empieza aquí
            </Text>
            <View style={styles.footer}>
              <Text variant="caption" color={colors.accent} numberOfLines={1}>
                Ingresos, gastos, deudas y ahorros
              </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.accent} />
            </View>
          </>
        ) : (
          <>
            <Text
              variant="title"
              color={isPositive ? colors.textPrimary : colors.danger}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatCurrency(summary.available, currency)}
            </Text>

            <View style={styles.footer}>
              <Text
                variant="caption"
                color={summary.pendingThisMonth > 0 ? colors.warning : colors.accent}
                numberOfLines={1}
              >
                {summary.pendingThisMonth > 0
                  ? `${summary.pendingThisMonth} ${pluralize(
                      summary.pendingThisMonth,
                      'pago pendiente',
                      'pagos pendientes',
                    )}`
                  : 'Disponible este mes'}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.accent} />
            </View>
          </>
        )}
      </View>

      <Image
        source={mascot.finance}
        style={styles.mascot}
        resizeMode="contain"
        accessible={false}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingLeft: spacing.lg,
    ...shadows.card,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  mascot: {
    width: CARD_HEIGHT * 1.1,
    height: CARD_HEIGHT,
  },
});
