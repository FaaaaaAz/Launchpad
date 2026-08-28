import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ChipSelector } from '@/components/form';
import type { ChipOption } from '@/components/form';
import { Badge, Button, Card, ListRow, Screen, ScreenHeader, SectionHeader, Text } from '@/components/ui';
import { AVAILABLE_CURRENCIES, MASCOT_NAME } from '@/constants';
import { deleteAllUserData } from '@/features/account/accountService';
import { useActivities } from '@/features/activities/ActivitiesProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTasks } from '@/features/tasks/TasksProvider';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSettings } from '@/providers/SettingsProvider';
import {
  ensurePermission,
  getPermissionState,
  getScheduledCount,
  scheduleInSeconds,
  type PermissionState,
} from '@/services/notifications';
import { colors, spacing } from '@/theme';

/** Segundos de espera de la notificación de prueba. */
const TEST_NOTIFICATION_DELAY = 5;

const CURRENCY_OPTIONS: ChipOption<string>[] = AVAILABLE_CURRENCIES.map((currency) => ({
  value: currency,
  label: currency,
}));

const PERMISSION_LABELS: Record<PermissionState, { label: string; color: string }> = {
  granted: { label: 'Activadas', color: colors.success },
  denied: { label: 'Bloqueadas', color: colors.danger },
  undetermined: { label: 'Sin configurar', color: colors.warning },
};

export default function SettingsScreen() {
  const { currency, setCurrency, replayWelcome } = useSettings();
  const { user, profile } = useAuth();
  const { tasks, refresh: refreshTasks } = useTasks();
  const { activities, refresh: refreshActivities } = useActivities();

  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [scheduledCount, setScheduledCount] = useState(0);

  const refreshNotificationState = useCallback(async () => {
    setPermission(await getPermissionState());
    setScheduledCount(await getScheduledCount());
  }, []);

  useEffect(() => {
    void refreshNotificationState();
  }, [refreshNotificationState]);

  /**
   * Notificación de prueba: es la forma más directa de comprobar en el
   * teléfono que los permisos y la programación funcionan de punta a punta.
   */
  const sendTestNotification = useAsyncAction(async () => {
    const state = await ensurePermission();
    setPermission(state);

    if (state !== 'granted') {
      Alert.alert(
        'Notificaciones desactivadas',
        'Actívalas para Launchpad desde los Ajustes de tu teléfono y vuelve a intentarlo.',
      );
      return;
    }

    await scheduleInSeconds(TEST_NOTIFICATION_DELAY, {
      title: 'Launchpad funciona',
      body: 'Esta es tu notificación de prueba. Los recordatorios están listos.',
    });

    await refreshNotificationState();

    Alert.alert(
      'Notificación programada',
      `Llegará en ${TEST_NOTIFICATION_DELAY} segundos. Puedes cerrar la app para verla aparecer.`,
    );
  });

  const clearData = useAsyncAction(async () => {
    await deleteAllUserData();
    await Promise.all([refreshTasks(), refreshActivities()]);
    await refreshNotificationState();
    Alert.alert('Datos borrados', 'Tu cuenta quedó como recién creada.');
  });

  const confirmClearData = () => {
    Alert.alert(
      'Borrar todos los datos',
      'Se eliminarán tus tareas, actividades, pagos, recordatorios y tu alcancía, en este teléfono y en tu cuenta. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: () => void clearData.run(),
        },
      ],
    );
  };

  const permissionMeta = PERMISSION_LABELS[permission];
  const displayName = profile?.displayName?.trim() ?? '';

  return (
    <Screen>
      <ScreenHeader title="Configuración" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <SectionHeader title="Cuenta" icon="person-circle-outline" />

          {/*
            El nombre ya no se edita aquí: vive en el perfil, junto al correo y
            al método de acceso. Tenerlo en dos sitios haría que uno de los dos
            acabara mostrando algo viejo.
          */}
          <ListRow
            title={displayName || 'Mi cuenta'}
            subtitle={user?.email ?? 'Gestiona tu perfil y tu acceso'}
            icon="person-outline"
            iconColor={colors.accent}
            onPress={() => router.push('/account')}
            showChevron
          />
        </Card>

        <Card>
          <SectionHeader
            title="Moneda"
            icon="cash-outline"
            subtitle="Se usa en los montos de tus actividades"
          />

          <ChipSelector
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={(value) => void setCurrency(value ?? currency)}
          />

          <Text variant="caption" tone="muted" style={styles.note}>
            La moneda es una preferencia de este teléfono, no de tu cuenta.
          </Text>
        </Card>

        <Card>
          <SectionHeader title="Notificaciones" icon="notifications-outline" />

          <ListRow
            title="Permiso del sistema"
            subtitle="Necesario para que suenen los recordatorios"
            icon="shield-checkmark-outline"
            iconColor={permissionMeta.color}
            trailing={
              <Badge
                label={permissionMeta.label}
                color={permissionMeta.color}
                backgroundColor={`${permissionMeta.color}1F`}
                size="small"
              />
            }
          />

          <View style={styles.divider} />

          <ListRow
            title="Recordatorios programados"
            subtitle="Notificaciones esperando en el sistema"
            icon="alarm-outline"
            trailingText={String(scheduledCount)}
          />

          <Button
            label="Enviar notificación de prueba"
            onPress={() => void sendTestNotification.run()}
            loading={sendTestNotification.isRunning}
            variant="secondary"
            icon="send-outline"
            fullWidth
            style={styles.inlineAction}
          />
        </Card>

        <Card>
          <SectionHeader title="Tus datos" icon="server-outline" />

          <ListRow title="Tareas" icon="checkbox-outline" trailingText={String(tasks.length)} />
          <View style={styles.divider} />
          <ListRow
            title="Actividades"
            icon="grid-outline"
            trailingText={String(activities.length)}
          />

          <Text variant="caption" tone="muted" style={styles.note}>
            Todo se guarda en tu cuenta de Launchpad, no en este teléfono. Si borras la app y la
            vuelves a instalar, tus datos regresan al iniciar sesión.
          </Text>

          <Button
            label="Borrar todos los datos"
            onPress={confirmClearData}
            loading={clearData.isRunning}
            variant="danger"
            icon="trash-outline"
            fullWidth
            style={styles.inlineAction}
          />

          {clearData.error ? (
            <Text variant="caption" tone="danger" style={styles.note}>
              {clearData.error}
            </Text>
          ) : null}
        </Card>

        <Card>
          <SectionHeader title="Acerca de" icon="information-circle-outline" />

          <ListRow title="Launchpad" subtitle="Versión 1.0.0" icon="rocket-outline" />

          <View style={styles.divider} />

          <ListRow
            title={`Saludo de ${MASCOT_NAME}`}
            subtitle="Repite la animación de bienvenida"
            icon="paw-outline"
            iconColor={colors.accent}
            onPress={() => {
              void replayWelcome();
              router.back();
            }}
            showChevron
          />
        </Card>

        <Button label="Volver" onPress={() => router.back()} variant="ghost" fullWidth />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  inlineAction: {
    marginTop: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  note: {
    marginTop: spacing.sm,
  },
});
