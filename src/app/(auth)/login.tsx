import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TextField } from '@/components/form';
import { Button } from '@/components/ui';
import { PAD_AUTH_LINES, mascot } from '@/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthDivider } from '@/features/auth/components/AuthDivider';
import { AuthFeedback } from '@/features/auth/components/AuthFeedback';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { AuthLink } from '@/features/auth/components/AuthLink';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { validateLogin } from '@/features/auth/validation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { spacing } from '@/theme';
import { ValidationError } from '@/utils/errors';

/**
 * Inicio de sesión.
 *
 * Al entrar no se navega a ningún sitio: `AuthProvider` cambia de estado, el
 * layout raíz sustituye la pila de acceso por la de la app y el usuario
 * aparece en el dashboard. Empujar una ruta a mano desde aquí dejaría el login
 * en el historial, y el gesto de volver regresaría a él.
 */
export default function LoginScreen() {
  const { signIn, signInWithGoogle, linkError, dismissLinkError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useAsyncAction(async () => {
    const errors = validateLogin({ email, password });
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    await signIn(email, password);
  });

  const google = useAsyncAction(async () => {
    dismissLinkError();
    await signInWithGoogle();
  });

  const isBusy = login.isRunning || google.isRunning;

  const loadingMessage = login.isRunning
    ? 'Iniciando sesión…'
    : google.isRunning
      ? 'Conectando con Google…'
      : null;

  return (
    <AuthLayout
      mascot={mascot.welcome}
      eyebrow="Bienvenido de nuevo"
      title="Continúa con tu cuenta"
      padLine={PAD_AUTH_LINES.login}
      footer={
        <AuthLink
          question="¿No tienes una cuenta?"
          label="Registrarse"
          onPress={() => router.replace('/register')}
          disabled={isBusy}
        />
      }
    >
      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        error={login.fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        required
      />

      <PasswordField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Tu contraseña"
        error={login.fieldErrors.password}
        variant="current"
        returnKeyType="go"
        onSubmitEditing={() => void login.run()}
      />

      <View style={styles.forgot}>
        <AuthLink
          label="¿Olvidaste tu contraseña?"
          onPress={() => router.push('/forgot-password')}
          disabled={isBusy}
        />
      </View>

      <AuthFeedback
        loading={loadingMessage}
        error={login.error ?? google.error ?? linkError}
      />

      <Button
        label="Iniciar sesión"
        onPress={() => void login.run()}
        loading={login.isRunning}
        disabled={google.isRunning}
        fullWidth
        size="large"
      />

      <AuthDivider />

      <Button
        label="Continuar con Google"
        onPress={() => void google.run()}
        loading={google.isRunning}
        disabled={login.isRunning}
        variant="secondary"
        icon="logo-google"
        fullWidth
        size="large"
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: {
    // El enlace se alinea con el borde derecho del campo de arriba, que es
    // donde el ojo lo busca al terminar de escribir la contraseña.
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
  },
});
