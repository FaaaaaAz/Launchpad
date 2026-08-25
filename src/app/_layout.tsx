import type { ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootScreen } from '@/components/BootScreen';
import { ActivitiesProvider } from '@/features/activities/ActivitiesProvider';
import { TasksProvider } from '@/features/tasks/TasksProvider';
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
  const { isLoading, onboardingCompleted } = useSettings();

  if (isLoading) return <BootScreen />;

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
