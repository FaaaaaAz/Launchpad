import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  ListRow,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/BubbleTabBar';
import { PAYMENT_STATUS_META, getDomainConfig } from '@/constants';
import { useActivities } from '@/features/activities/ActivitiesProvider';
import {
  countByDomain,
  selectActivitiesForDay,
  selectPaymentAlerts,
} from '@/features/activities/activitySelectors';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { DayProgressCard } from '@/features/dashboard/components/DayProgressCard';
import { ModuleSummaryRow } from '@/features/dashboard/components/ModuleSummaryRow';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { useTasks } from '@/features/tasks/TasksProvider';
import { selectDayScope } from '@/features/tasks/taskSelectors';
import { useSettings } from '@/providers/SettingsProvider';
import { colors, spacing } from '@/theme';
import { formatDateShort, formatTimeRange } from '@/utils/date';

/** Cuántas tareas del día se muestran antes de mandar a la pestaña completa. */
const MAX_TASKS_PREVIEW = 4;

/**
 * Dashboard.
 *
 * Responde a "¿qué tengo hoy?" y nada más. Cada bloque desaparece cuando no
 * tiene contenido, de modo que la pantalla crece con el uso en lugar de
 * mostrar huecos vacíos desde el primer día.
 */
export default function DashboardScreen() {
  const { userName } = useSettings();
  const { tasks, toggleTask, refresh: refreshTasks } = useTasks();
  const { activities, refresh: refreshActivities } = useActivities();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const day = useMemo(() => selectDayScope(tasks), [tasks]);
  const todayActivities = useMemo(() => selectActivitiesForDay(activities), [activities]);
  const paymentAlerts = useMemo(() => selectPaymentAlerts(activities), [activities]);
  const counts = useMemo(() => countByDomain(activities), [activities]);

  const previewTasks = day.pending.slice(0, MAX_TASKS_PREVIEW);
  const hasNothing =
    day.total === 0 && todayActivities.length === 0 && activities.length === 0;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refreshTasks(), refreshActivities()]);
    setIsRefreshing(false);
  }, [refreshTasks, refreshActivities]);

  return (
    <Screen>
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
        <DashboardHeader userName={userName} />

        <View style={styles.sections}>
          <DayProgressCard
            completed={day.completed}
            total={day.total}
            overdue={day.overdue}
          />

          <ModuleSummaryRow counts={counts} />

          {previewTasks.length > 0 ? (
            <View>
              <SectionHeader
                title="Para hoy"
                icon="checkbox-outline"
                actionLabel={day.pending.length > MAX_TASKS_PREVIEW ? 'Ver todas' : undefined}
                onActionPress={
                  day.pending.length > MAX_TASKS_PREVIEW
                    ? () => router.push('/tasks')
                    : undefined
                }
              />

              <View style={styles.stack}>
                {previewTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => void toggleTask(task)}
                    onPress={() =>
                      router.push({ pathname: '/task/[id]', params: { id: task.id } })
                    }
                  />
                ))}
              </View>
            </View>
          ) : null}

          {todayActivities.length > 0 ? (
            <View>
              <SectionHeader title="Actividades de hoy" icon="calendar-outline" />

              <Card>
                {todayActivities.map((activity, index) => {
                  const config = getDomainConfig(activity.domain);

                  return (
                    <View key={activity.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <ListRow
                        title={activity.name}
                        subtitle={activity.subtitle ?? config.title}
                        icon={config.icon}
                        iconColor={config.color}
                        trailingText={
                          formatTimeRange(activity.startTime, activity.endTime) || undefined
                        }
                        onPress={() =>
                          router.push({
                            pathname: '/activity/[id]',
                            params: { id: activity.id },
                          })
                        }
                        showChevron
                      />
                    </View>
                  );
                })}
              </Card>
            </View>
          ) : null}

          {paymentAlerts.length > 0 ? (
            <View>
              <SectionHeader
                title="Pagos"
                icon="wallet-outline"
                subtitle="Vencimientos que necesitan atención"
              />

              <Card>
                {paymentAlerts.map((alert, index) => {
                  const meta = PAYMENT_STATUS_META[alert.status];

                  return (
                    <View key={alert.activity.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <ListRow
                        title={alert.activity.name}
                        subtitle={
                          alert.activity.nextPaymentDate
                            ? `Vence el ${formatDateShort(alert.activity.nextPaymentDate)}`
                            : undefined
                        }
                        icon="card-outline"
                        iconColor={meta.color}
                        trailing={
                          <Badge
                            label={meta.label}
                            color={meta.color}
                            backgroundColor={meta.softColor}
                            size="small"
                          />
                        }
                        onPress={() =>
                          router.push({
                            pathname: '/activity/[id]',
                            params: { id: alert.activity.id },
                          })
                        }
                      />
                    </View>
                  );
                })}
              </Card>
            </View>
          ) : null}

          {hasNothing ? (
            <Card>
              <View style={styles.welcome}>
                <Text variant="heading">Empecemos</Text>
                <Text variant="body" tone="muted">
                  Launchpad se llena con lo que tú pongas. Crea tu primera tarea o
                  registra una actividad como tu gimnasio.
                </Text>

                <View style={styles.welcomeActions}>
                  <Button
                    label="Nueva tarea"
                    icon="add"
                    onPress={() => router.push('/task/new')}
                  />
                  <Button
                    label="Nueva actividad"
                    icon="barbell-outline"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: '/activity/new',
                        params: { domain: 'exercise' },
                      })
                    }
                  />
                </View>
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  sections: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl,
  },
  stack: {
    gap: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  welcome: {
    gap: spacing.md,
  },
  welcomeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
