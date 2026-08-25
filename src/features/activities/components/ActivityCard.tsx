import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { ACTIVITY_STATUS_META, PAYMENT_STATUS_META, getDomainConfig } from '@/constants';
import { imageStorage } from '@/services/imageStorage';
import { colors, spacing } from '@/theme';
import type { Activity } from '@/types';
import { formatDateLong, formatTimeRange, formatWeekdays } from '@/utils/date';
import { formatCurrency, initials } from '@/utils/format';

import { getPaymentStatus } from '../activityService';

export interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
  categoryName?: string;
}

/**
 * Card principal de una actividad.
 *
 * Muestra de un vistazo lo que uno realmente necesita saber: qué es, qué días,
 * a qué hora y si el pago está al día. El resto queda en el detalle.
 */
export function ActivityCard({ activity, onPress, categoryName }: ActivityCardProps) {
  const domain = getDomainConfig(activity.domain);
  const imageUri = imageStorage.resolve(activity.imageKey);
  const paymentStatus = getPaymentStatus(activity);
  const payment = PAYMENT_STATUS_META[paymentStatus];
  const status = ACTIVITY_STATUS_META[activity.status];

  const schedule = formatWeekdays(activity.weekdays);
  const hours = formatTimeRange(activity.startTime, activity.endTime);

  return (
    <Card flush onPress={onPress} accessibilityLabel={activity.name}>
      <View style={styles.cover}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.fallback, { backgroundColor: `${domain.color}1F` }]}>
            <Text variant="display" color={domain.color}>
              {initials(activity.name)}
            </Text>
          </View>
        )}

        {/* Vela oscura para que el badge se lea sobre cualquier foto. */}
        <View style={styles.coverScrim} />

        <View style={styles.coverBadges}>
          {activity.status !== 'active' ? (
            <Badge
              label={status.label}
              icon={status.icon}
              color={status.color}
              backgroundColor={colors.overlay}
              size="small"
            />
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <Text variant="title" numberOfLines={1}>
              {activity.name}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {[categoryName, activity.subtitle].filter(Boolean).join(' · ') ||
                domain.title}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        {schedule || hours ? (
          <View style={styles.scheduleRow}>
            {schedule ? (
              <View style={styles.metaItem}>
                <Ionicons name="repeat" size={14} color={domain.color} />
                <Text variant="caption" tone="secondary">
                  {schedule}
                </Text>
              </View>
            ) : null}

            {hours ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={domain.color} />
                <Text variant="caption" tone="secondary">
                  {hours}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {activity.billingCycle !== 'none' ? (
          <View style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
              {activity.billingAmount !== null ? (
                <Text variant="bodyStrong">
                  {formatCurrency(activity.billingAmount, activity.currency)}
                </Text>
              ) : null}

              {activity.nextPaymentDate ? (
                <Text variant="caption" tone="muted">
                  Próximo pago: {formatDateLong(activity.nextPaymentDate)}
                </Text>
              ) : null}
            </View>

            <Badge
              label={payment.label}
              icon={payment.icon}
              color={payment.color}
              backgroundColor={payment.softColor}
            />
          </View>
        ) : activity.endDate ? (
          <View style={styles.paymentRow}>
            <Text variant="caption" tone="muted">
              Hasta el {formatDateLong(activity.endDate)}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 132,
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
  coverScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 14, 20, 0.18)',
  },
  coverBadges: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  paymentInfo: {
    flex: 1,
    gap: 2,
  },
});
