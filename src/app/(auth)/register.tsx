import { router } from 'expo-router';
import { useState } from 'react';

import { TextField } from '@/components/form';
import { Button } from '@/components/ui';
import { PAD_AUTH_LINES, mascot } from '@/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthDivider } from '@/features/auth/components/AuthDivider';
import { AuthFeedback } from '@/features/auth/components/AuthFeedback';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { AuthLink } from '@/features/auth/components/AuthLink';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, validateRegister } from '@/features/auth/validation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { ValidationError } from '@/utils/errors';

/**
 * Creación de cuenta.
 *
 * Tiene dos finales posibles y ninguno depende de este archivo, sino de un
 * ajuste del proyecto de Supabase (Authentication -> Providers -> Email ->
 * Confirm email):
 *
 *   Confirmación desactivada  ->  Supabase devuelve sesión y el usuario entra
 *                                 directo al dashboard.
 *   Confirmación activada     ->  no hay sesión todavía; hay que abrir el
 *                                 correo. La pantalla se queda mostrando eso.
 *
 * Se contemplan los dos porque el ajuste puede cambiar sin tocar la app, y una
 * pantalla que se quedara en blanco esperando una sesión que no llega sería un
 * callejón sin salida.
 */
export default function RegisterScreen() {
  const { signUp, signInWithGoogle, linkError, dismissLinkError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const register = useAsyncAction(async () => {
    const errors = validateRegister({ name, email, password, confirmPassword });
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    const result = await signUp({ name, email, password });

    // Con sesión no hay nada que hacer aquí: el layout raíz cambia de pila y
    // el usuario aparece en el dashboard.
    if (result.needsEmailConfirmation) setAwaitingConfirmation(true);
  });

  const google = useAsyncAction(async () => {
    dismissLinkError();
    await signInWithGoogle();
  });

  /* ------------------------------------------------------------------ */
  /* Correo enviado                                                     */
  /* ------------------------------------------------------------------ */

  if (awaitingConfirmation) {
    return (
      <AuthLayout
        mascot={mascot.dance}
        eyebrow="Ya casi"
        title="Confirma tu correo"
        subtitle={`Enviamos un mensaje a ${email.trim()}. Ábrelo desde este mismo teléfono y entrarás automáticamente.`}
        padLine={PAD_AUTH_LINES.confirmEmail}
        footer={
          <AuthLink
            question="¿Ya lo confirmaste?"
            label="Iniciar sesión"
            onPress={() => router.replace('/login')}
          />
        }
      >
        <AuthFeedback success="Cuenta creada correctamente." />

        <Button
          label="Volver al inicio de sesión"
          onPress={() => router.replace('/login')}
          variant="secondary"
          icon="mail-outline"
          fullWidth
          size="large"
        />
      </AuthLayout>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Formulario                                                         */
  /* ------------------------------------------------------------------ */

  const loadingMessage = register.isRunning
    ? 'Creando cuenta…'
    : google.isRunning
      ? 'Conectando con Google…'
      : null;

  return (
    <AuthLayout
      mascot={mascot.dance}
      eyebrow="Empecemos"
      title="Crea tu cuenta"
      padLine={PAD_AUTH_LINES.register}
      footer={
        <AuthLink
          question="¿Ya tienes una cuenta?"
          label="Iniciar sesión"
          onPress={() => router.replace('/login')}
          disabled={register.isRunning || google.isRunning}
        />
      }
    >
      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="¿Cómo quieres que te salude?"
        error={register.fieldErrors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={MAX_NAME_LENGTH}
        required
      />

      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        error={register.fieldErrors.email}
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
        placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
        hint={`Al menos ${MIN_PASSWORD_LENGTH} caracteres.`}
        error={register.fieldErrors.password}
        variant="new"
      />

      <PasswordField
        label="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Repite la contraseña"
        error={register.fieldErrors.confirmPassword}
        variant="new"
        returnKeyType="go"
        onSubmitEditing={() => void register.run()}
      />

      <AuthFeedback
        loading={loadingMessage}
        error={register.error ?? google.error ?? linkError}
      />

      <Button
        label="Crear cuenta"
        onPress={() => void register.run()}
        loading={register.isRunning}
        disabled={google.isRunning}
        fullWidth
        size="large"
        icon="rocket-outline"
      />

      <AuthDivider />

      <Button
        label="Continuar con Google"
        onPress={() => void google.run()}
        loading={google.isRunning}
        disabled={register.isRunning}
        variant="secondary"
        icon="logo-google"
        fullWidth
        size="large"
      />
    </AuthLayout>
  );
}
