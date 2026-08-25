import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  ListRow,
  Screen,
  ScreenHeader,
  SectionHeader,
  Text,
} from '@/components/ui';
import {
  ACTIVITY_STATUS_META,
  BILLING_CYCLE_LABELS,
  PAYMENT_STATUS_META,
  getDomainConfig,
} from '@/constants';
import { useActivities } from '@/features/activities/ActivitiesProvider';
import { getPaymentStatus, listPayments } from '@/features/activities/activityService';
import { RegisterPaymentSheet } from '@/features/activities/components/RegisterPaymentSheet';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useCategories } from '@/hooks/useCategories';
import { imageStorage } from '@/services/imageStorage';
import { colors, radius, spacing } from '@/theme';
import type { DateOnly, Payment } from '@/types';
import { formatDateLong, formatTimeRange, formatWeekdays } from '@/utils/date';
import { formatCurrency, initials } from '@/utils/format';

/** Cuántos pagos recientes se listan en el detalle. */
const MAX_PAYMENTS = 5;

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, registerPayment } = useActivities();
  const activity = getById(id);

  const { categories } = useCategories(activity?.domain ?? 'exercise');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!activity) return;
    setPayments(await listPayments(activity.id));
  }, [activity]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const submitPayment = useAsyncAction(
    async (input: { amount: number; paidAt: DateOnly }) => {
      if (!activity) return undefined;
      const payment = await registerPayment(activity, input);
      await loadPayments();
      setIsSheetOpen(false);
      return payment;
    },
  );

  if (!activity) {
    return (
      <Screen>
        <ScreenHeader title="Actividad" showBack />
        <View style={styles.missing}>
          <Text variant="body" tone="muted">
            Esta actividad ya no existe.
          </Text>
        </View>
      </Screen>
    );
  }

  const config = getDomainConfig(activity.domain);
  const status = ACTIVITY_STATUS_META[activity.status];
  const paymentStatus = PAYMENT_STATUS_META[getPaymentStatus(activity)];
  const imageUri = imageStorage.resolve(activity.imageKey);
  const category = categories.find((item) => item.id === activity.categoryId);
  const schedule = formatWeekdays(activity.weekdays);
  const hours = formatTimeRange(activity.startTime, activity.endTime);
  const hasBilling = activity.billingCycle !== 'none';

  return (
    <Screen>
      <ScreenHeader
        title={activity.name}
        subtitle={[category?.name, activity.subtitle].filter(Boolean).join(' · ') || config.title}
        showBack
        accentColor={config.color}
        actionIcon="create-outline"
        actionLabel="Editar"
        onActionPress={() =>
          router.push({ pathname: '/activity/edit/[id]', params: { id: activity.id } })
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.fallback, { backgroundColor: `${config.color}1F` }]}>
              <Text variant="display" color={config.color}>
                {initials(activity.name)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.badges}>
          <Badge
            label={status.label}
            icon={status.icon}
            color={status.color}
            backgroundColor={`${status.color}1F`}
          />
          {hasBilling ? (
            <Badge
              label={paymentStatus.label}
              icon={paymentStatus.icon}
              color={paymentStatus.color}
              backgroundColor={paymentStatus.softColor}
            />
          ) : null}
        </View>

        <Card>
          <SectionHeader title="Detalles" icon="information-circle-outline" />

          <InfoRow label="Días" value={schedule || 'Sin días definidos'} />
          <InfoRow label="Horario" value={hours || 'Sin horario'} />
          {activity.location ? <InfoRow label="Lugar" value={activity.location} /> : null}
          {activity.startDate ? (
            <InfoRow label="Inicio" value={formatDateLong(activity.startDate)} />
          ) : null}
          {activity.endDate ? (
            <InfoRow label="Vence" value={formatDateLong(activity.endDate)} />
          ) : null}
        </Card>

        {hasBilling ? (
          <Card>
            <SectionHeader
              title="Dinero"
              icon="wallet-outline"
              subtitle={BILLING_CYCLE_LABELS[activity.billingCycle]}
            />

            {activity.billingAmount !== null ? (
              <InfoRow
                label="Monto"
                value={formatCurrency(activity.billingAmount, activity.currency)}
              />
            ) : null}
            {activity.lastPaymentDate ? (
              <InfoRow label="Último pago" value={formatDateLong(activity.lastPaymentDate)} />
            ) : null}
            {activity.nextPaymentDate ? (
              <InfoRow
                label="Próximo pago"
                value={formatDateLong(activity.nextPaymentDate)}
                valueColor={paymentStatus.color}
              />
            ) : null}

            <Button
              label="Registrar pago"
              onPress={() => setIsSheetOpen(true)}
              icon="checkmark-circle-outline"
              variant="secondary"
              fullWidth
              style={styles.payButton}
            />
          </Card>
        ) : null}

        {payments.length > 0 ? (
          <Card>
            <SectionHeader title="Pagos recientes" icon="receipt-outline" />

            {payments.slice(0, MAX_PAYMENTS).map((payment, index) => (
              <View key={payment.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <ListRow
                  title={formatCurrency(payment.amount, payment.currency)}
                  subtitle={formatDateLong(payment.paidAt)}
                  icon="card-outline"
                  iconColor={colors.success}
                  trailingText={
                    payment.coversUntil ? `Hasta ${formatDateLong(payment.coversUntil)}` : undefined
                  }
                />
              </View>
            ))}
          </Card>
        ) : null}

        {activity.notes ? (
          <Card>
            <SectionHeader title="Notas" icon="document-text-outline" />
            <Text variant="body" tone="secondary">
              {activity.notes}
            </Text>
          </Card>
        ) : null}
      </ScrollView>

      <RegisterPaymentSheet
        activity={activity}
        visible={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onConfirm={(input) => void submitPayment.run(input)}
        isSubmitting={submitPayment.isRunning}
        error={submitPayment.error}
      />
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="bodyStrong" color={valueColor} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  hero: {
    height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  payButton: {
    marginTop: spacing.md,
  },
  missing: {
    padding: spacing.xl,
  },
});
