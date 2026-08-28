import { router } from 'expo-router';
import { useState } from 'react';

import { TextField } from '@/components/form';
import { Button } from '@/components/ui';
import { PAD_AUTH_LINES, mascot } from '@/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { AuthFeedback } from '@/features/auth/components/AuthFeedback';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { AuthLink } from '@/features/auth/components/AuthLink';
import { validateEmailOnly } from '@/features/auth/validation';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { ValidationError } from '@/utils/errors';

/**
 * Recuperación de contraseña, primer paso.
 *
 * Dos cosas que conviene tener presentes al leer esto:
 *
 * 1. La respuesta es la misma exista o no la cuenta. Es lo que hace Supabase
 *    por defecto y no conviene deshacerlo: si el mensaje cambiara, este
 *    formulario sería una forma de averiguar quién tiene cuenta.
 *
 * 2. El enlace del correo hay que abrirlo EN ESTE MISMO TELÉFONO. Con el flujo
 *    PKCE, al pedir la recuperación se guarda un verificador en este
 *    dispositivo, y el enlace solo sirve acompañado de él. Por eso se avisa en
 *    la pantalla en lugar de dejar que el usuario lo descubra con un error.
 */
export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const send = useAsyncAction(async () => {
    const errors = validateEmailOnly(email);
    if (Object.keys(errors).length > 0) throw new ValidationError(errors);

    await resetPassword(email);
    setSent(true);
  });

  if (sent) {
    return (
      <AuthLayout
        mascot={mascot.hobby}
        eyebrow="Listo"
        title="Revisa tu correo"
        subtitle={`Si existe una cuenta con ${email.trim()}, le enviamos un enlace para elegir una contraseña nueva.`}
        padLine={PAD_AUTH_LINES.emailSent}
        footer={
          <AuthLink
            question="¿No llegó?"
            label="Enviar otra vez"
            onPress={() => setSent(false)}
          />
        }
      >
        <AuthFeedback success="Correo enviado." />

        <Button
          label="Volver al inicio de sesión"
          onPress={() => router.back()}
          variant="secondary"
          icon="arrow-back"
          fullWidth
          size="large"
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      mascot={mascot.hobby}
      eyebrow="Sin problema"
      title="Recupera tu acceso"
      subtitle="Escribe el correo de tu cuenta y te mandamos un enlace para crear una contraseña nueva."
      padLine={PAD_AUTH_LINES.forgotPassword}
      footer={
        <AuthLink
          question="¿Te acordaste?"
          label="Volver al inicio de sesión"
          onPress={() => router.back()}
          disabled={send.isRunning}
        />
      }
    >
      <TextField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        hint="Abre el enlace desde este mismo teléfono: es donde queda guardada la clave que lo valida."
        error={send.fieldErrors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={() => void send.run()}
        required
      />

      <AuthFeedback
        loading={send.isRunning ? 'Enviando correo…' : null}
        error={send.error}
      />

      <Button
        label="Enviar enlace"
        onPress={() => void send.run()}
        loading={send.isRunning}
        fullWidth
        size="large"
        icon="mail-outline"
      />
    </AuthLayout>
  );
}
