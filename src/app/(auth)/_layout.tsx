import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * La bienvenida es la puerta de entrada, no el login.
 *
 * Sin esto el router elegiria la primera ruta por orden alfabético y quien
 * abriera Launchpad por primera vez aterrizaría en un formulario, sin saber
 * todavía qué es la app.
 */
export const unstable_settings = {
  initialRouteName: 'welcome',
};

/**
 * Pantallas de acceso.
 *
 * Solo existen cuando NO hay sesión: el layout raíz las monta dentro de un
 * `Stack.Protected`, así que al iniciar sesión desaparecen del árbol de
 * navegación en lugar de quedarse detrás. Es lo que hace que el botón de
 * volver del teléfono no pueda regresar al login desde el dashboard.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
