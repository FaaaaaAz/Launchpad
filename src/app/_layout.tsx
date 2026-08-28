import type { ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootScreen } from '@/components/BootScreen';
import { ActivitiesProvider } from '@/features/activities/ActivitiesProvider';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { LocalImportGate } from '@/features/auth/components/LocalImportGate';
import { FinanceProvider } from '@/features/finance/FinanceProvider';
import { ReminderSync } from '@/features/notifications/ReminderSync';
import { TasksProvider } from '@/features/tasks/TasksProvider';
import { MascotWelcome } from '@/features/welcome/MascotWelcome';
import { DatabaseProvider, useDatabaseStatus } from '@/providers/DatabaseProvider';
import { SettingsProvider, useSettings } from '@/providers/SettingsProvider';
import { colors } from '@/theme';

/**
 * Raíz de la aplicación.
 *
 * Orden de montaje, y por qué es este:
 *
 *   SQLite        Guarda las preferencias del dispositivo y los datos previos
 *                 a las cuentas. Nada puede leerse antes de sus migraciones.
 *   Preferencias  Necesitan SQLite.
 *   Sesión        Necesita saber si hay alguien dentro antes de decidir qué
 *                 navegación existe.
 *   Datos         Necesitan sesión: sin ella, Supabase no devuelve nada.
 *
 * La regla que sostiene todo esto: los providers de datos se montan DENTRO de
 * la sesión, nunca fuera. Si vivieran arriba, pedirían tareas antes de saber
 * de quién son, y al cambiar de cuenta enseñarían las del usuario anterior
 * hasta que terminara la siguiente consulta.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <DatabaseProvider>
        <DatabaseGate>
          <SettingsProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </SettingsProvider>
        </DatabaseGate>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

/** No monta la app hasta que la persistencia local esté lista. */
function DatabaseGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useDatabaseStatus();

  if (status === 'loading') return <BootScreen />;
  if (status === 'error') return <BootScreen error={error} onRetry={retry} />;

  return <>{children}</>;
}

function RootNavigator() {
  const { status, configError, user, recoveryPending } = useAuth();

  /**
   * Sin `.env` no hay nada que hacer, y el error tiene que ser explícito.
   * Es el fallo número uno al clonar el repositorio, y una pantalla en blanco
   * no ayudaría a nadie a resolverlo.
   */
  if (configError) return <BootScreen error={configError} />;

  /**
   * Aquí es donde se evita el parpadeo del login.
   *
   * Mientras no se sepa si hay sesión guardada, no se enseña ninguna de las
   * dos navegaciones. Dibujar el login «por si acaso» y sustituirlo medio
   * segundo después es exactamente el defecto que se quería evitar.
   */
  if (status === 'loading') return <BootScreen />;

  const isSignedIn = status === 'signed-in';

  // Con la recuperación en curso hay sesión, pero el usuario todavía no está
  // «dentro»: lo único que puede hacer es elegir una contraseña nueva.
  const isInApp = isSignedIn && !recoveryPending;

  if (!isInApp || !user) {
    return (
      <View style={styles.root}>
        <AppStack isSignedIn={isSignedIn} isRecovering={recoveryPending} />
      </View>
    );
  }

  return (
    /**
     * `key` con el UUID del usuario: al entrar otra cuenta, todo el árbol de
     * datos se vuelve a montar desde cero. Sin esto, el estado de la sesión
     * anterior sobreviviría en memoria y el dashboard mostraría sus tareas
     * durante el instante que tarda la primera consulta.
     */
    <SignedInScope key={user.id}>
      <AppStack isSignedIn isRecovering={false} />
    </SignedInScope>
  );
}

/**
 * Todo lo que solo tiene sentido con una cuenta detrás.
 *
 * `LocalImportGate` va antes que los providers de datos a propósito: sube a la
 * cuenta lo que hubiera en el teléfono ANTES de que nadie lea la lista, de
 * modo que el dashboard aparece ya completo y no medio vacío.
 */
function SignedInScope({ children }: { children: ReactNode }) {
  return (
    <LocalImportGate>
      <ReminderSync />
      <TasksProvider>
        <ActivitiesProvider>
          <FinanceProvider>
            <View style={styles.root}>
              {children}
              <WelcomeOverlay />
            </View>
          </FinanceProvider>
        </ActivitiesProvider>
      </TasksProvider>
    </LocalImportGate>
  );
}

/**
 * Saludo animado de PAD.
 *
 * Se monta por encima de TODA la navegación, no dentro del Home: si viviera
 * dentro de la pantalla, la barra de pestañas quedaría por encima y se vería
 * iluminada mientras el resto está atenuado.
 *
 * Aparece una vez por usuario y por dispositivo, así que también saluda al
 * reinstalar la app o al entrar con otra cuenta —que es justo cuando tiene
 * sentido volver a presentarse.
 */
function WelcomeOverlay() {
  const { user, profile } = useAuth();
  const { welcomeSeenFor, markWelcomeSeen } = useSettings();

  if (!user || welcomeSeenFor === user.id) return null;

  return (
    <MascotWelcome
      userName={profile?.displayName ?? ''}
      onDismiss={() => void markWelcomeSeen(user.id)}
    />
  );
}

interface AppStackProps {
  isSignedIn: boolean;
  isRecovering: boolean;
}

function AppStack({ isSignedIn, isRecovering }: AppStackProps) {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/*
        `Protected` decide qué rutas EXISTEN, no cuáles se ven. Una ruta que no
        existe no se puede alcanzar ni con el gesto de volver ni escribiendo un
        enlace, que es lo que hace que el dashboard no pueda regresar al login
        ni al revés.

        Los tres grupos son excluyentes y cubren todos los casos: siempre hay
        exactamente uno activo.
      */}
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/*
        Contraseña nueva. Hay sesión —la abrió el enlace del correo— pero el
        usuario aún no está dentro: lo único disponible es esta pantalla.
      */}
      <Stack.Protected guard={isSignedIn && isRecovering}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn && !isRecovering}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="account/index" />
        <Stack.Screen name="account/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account/password" options={{ presentation: 'modal' }} />
        <Stack.Screen name="finance/index" />
        <Stack.Screen name="finance/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="finance/[id]" options={{ presentation: 'modal' }} />
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
