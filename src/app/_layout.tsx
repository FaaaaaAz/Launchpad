import type { ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootScreen } from '@/components/BootScreen';
import { ActivitiesProvider } from '@/features/activities/ActivitiesProvider';
import { TasksProvider } from '@/features/tasks/TasksProvider';
import { MascotWelcome } from '@/features/welcome/MascotWelcome';
import { DatabaseProvider, useDatabaseStatus } from '@/providers/DatabaseProvider';
import { SettingsProvider, useSettings } from '@/providers/SettingsProvider';
import { colors } from '@/theme';

/**
 * Raíz de la aplicación.
 *
 * Orden de montaje: primero la base de datos (nada puede leerse antes de que
 * terminen las migraciones), después las preferencias, y solo entonces los
 * datos y la navegación.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <DatabaseProvider>
        <DatabaseGate>
          <SettingsProvider>
            <TasksProvider>
              <ActivitiesProvider>
                <RootNavigator />
              </ActivitiesProvider>
            </TasksProvider>
          </SettingsProvider>
        </DatabaseGate>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

/** No monta la app hasta que la persistencia esté lista. */
function DatabaseGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useDatabaseStatus();

  if (status === 'loading') return <BootScreen />;
  if (status === 'error') return <BootScreen error={error} onRetry={retry} />;

  return <>{children}</>;
}

function RootNavigator() {
  const { isLoading, onboardingCompleted, welcomePending, userName, dismissWelcome } =
    useSettings();

  if (isLoading) return <BootScreen />;

  return (
    <View style={styles.root}>
      <AppStack />

      {/*
        La bienvenida se monta por encima de TODA la navegación, no dentro del
        Home: así el velo también atenúa la barra de pestañas, que si no
        quedaría iluminada sobre un fondo oscurecido.
      */}
      {onboardingCompleted && welcomePending ? (
        <MascotWelcome userName={userName} onDismiss={() => void dismissWelcome()} />
      ) : null}
    </View>
  );
}

function AppStack() {
  const { onboardingCompleted } = useSettings();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/*
        `Protected` decide qué rutas existen según el estado del onboarding.
        Al completarlo, el router redirige solo y limpia el historial, así que
        el botón de volver nunca regresa a la bienvenida.
      */}
      <Stack.Protected guard={!onboardingCompleted}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>

      <Stack.Protected guard={onboardingCompleted}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="activity/[id]" />
        <Stack.Screen name="activity/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="activity/edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="task/[id]" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
