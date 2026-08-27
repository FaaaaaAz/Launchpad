import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ChipSelector, TextField } from '@/components/form';
import type { ChipOption } from '@/components/form';
import { Badge, Button, Card, ListRow, Screen, ScreenHeader, SectionHeader, Text } from '@/components/ui';
import { AVAILABLE_CURRENCIES, MASCOT_NAME } from '@/constants';
import { clearUserData } from '@/database';
import { useActivities } from '@/features/activities/ActivitiesProvider';
import { useTasks } from '@/features/tasks/TasksProvider';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useSettings } from '@/providers/SettingsProvider';
import {
  cancelAll,
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
  const { userName, setUserName, currency, setCurrency, resetOnboarding, replayWelcome } =
    useSettings();
  const { tasks, refresh: refreshTasks } = useTasks();
  const { activities, refresh: refreshActivities } = useActivities();

  const [name, setName] = useState(userName);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [scheduledCount, setScheduledCount] = useState(0);

  const refreshNotificationState = useCallback(async () => {
    setPermission(await getPermissionState());
    setScheduledCount(await getScheduledCount());
  }, []);

  useEffect(() => {
    void refreshNotificationState();
  }, [refreshNotificationState]);

  const saveName = useAsyncAction(async () => {
    await setUserName(name);
    Alert.alert('Listo', 'Tu nombre se guardó.');
  });

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

  const confirmClearData = () => {
    Alert.alert(
      'Borrar todos los datos',
      'Se eliminarán tus tareas, actividades, pagos y recordatorios. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              // Primero se cancelan las notificaciones del sistema: si se
              // borraran solo las filas, seguirían sonando avisos de tareas
              // y pagos que ya no existen.
              await cancelAll();
              await clearUserData();
              await Promise.all([refreshTasks(), refreshActivities()]);
              await refreshNotificationState();
              Alert.alert('Datos borrados', 'Launchpad quedó como recién instalado.');
            })();
          },
        },
      ],
    );
  };

  const confirmResetOnboarding = () => {
    Alert.alert('Ver la bienvenida otra vez', 'Volverás a la pantalla inicial.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Ver de nuevo', onPress: () => void resetOnboarding() },
    ]);
  };

  const permissionMeta = PERMISSION_LABELS[permission];

  return (
    <Screen>
      <ScreenHeader title="Configuración" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <SectionHeader title="Perfil" icon="person-outline" />

          <TextField
            label="Tu nombre"
            value={name}
            onChangeText={setName}
            placeholder="¿Cómo quieres que te salude?"
            maxLength={40}
            autoCapitalize="words"
          />

          <Button
            label="Guardar"
            onPress={() => void saveName.run()}
            loading={saveName.isRunning}
            disabled={name.trim() === userName}
            size="small"
            style={styles.inlineAction}
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
            Todo se guarda solo en este teléfono, en una base de datos SQLite local. No hay
            servidor ni cuenta: si borras la app, se borran los datos.
          </Text>

          <Button
            label="Borrar todos los datos"
            onPress={confirmClearData}
            variant="danger"
            icon="trash-outline"
            fullWidth
            style={styles.inlineAction}
          />
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

          <View style={styles.divider} />

          <ListRow
            title="Ver la bienvenida otra vez"
            subtitle="Vuelve a la pantalla inicial de la app"
            icon="refresh-outline"
            onPress={confirmResetOnboarding}
            showChevron
          />
        </Card>

        <Button
          label="Volver"
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
        />
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
